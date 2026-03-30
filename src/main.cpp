#include <Arduino.h>
#include <MD_MAX72xx.h>
#include "web.h"

#define HARDWARE_TYPE MD_MAX72XX::FC16_HW
#define DATA_PIN 23
#define CLK_PIN 18
#define CS_PIN 5
#define NUM_DEVICES 4
#define ROWS 8
#define COLS 32
#define HASH_HISTORY 6
#define POT_PIN 34
#define BUZZER_PIN 19
#define BUZZER_CH 0

enum SimState {
    RUNNING,
    PAUSED
};

MD_MAX72XX mx = MD_MAX72XX(HARDWARE_TYPE, DATA_PIN, CLK_PIN, CS_PIN, NUM_DEVICES);

uint32_t grid[ROWS];
uint32_t next[ROWS];
uint32_t hashHistory[HASH_HISTORY];
int hashIndex = 0;

unsigned long lastGen = 0;
unsigned long toneEnd = 0;

SimState simState = PAUSED;

uint16_t genCount = 0;
uint32_t entropyAcc = 0; 
uint8_t peakPop = 0; 
uint32_t pBirthAcc = 0;
uint32_t pDeathAcc = 0;

uint32_t totalBorn = 0;
uint32_t totalDied = 0;

int sessionCount = 0;   // sessions in current 5-block
int historyCount = 0;   // total sessions ever recorded

// Rolling P(birth) history for lag-1 autocorrelation (computed at session end)
static float pBirthHistory[200];
static int   pBirthHistLen = 0;

// Per-session density accumulator (average over all generations)
static uint32_t densityAcc = 0;

// Compute lag-1 autocorrelation of an array, returned scaled by 100 as int8_t
static int8_t computeAutocorr(float* vals, int n) {
    if (n < 3) return 0;
    float mean = 0;
    for (int i = 0; i < n; i++) mean += vals[i];
    mean /= n;
    float num = 0, den = 0;
    for (int i = 0; i < n - 1; i++)
        num += (vals[i] - mean) * (vals[i + 1] - mean);
    for (int i = 0; i < n; i++)
        den += (vals[i] - mean) * (vals[i] - mean);
    if (den < 1e-9f) return 0;
    float ac = num / den;
    if (ac >  1.0f) ac =  1.0f;
    if (ac < -1.0f) ac = -1.0f;
    return (int8_t)(ac * 100.0f);
}

//helper functions 
float gridEntropy() {
    int pop = 0; 
    for (int r = 0; r < ROWS; r++){
        pop += __builtin_popcount(grid[r]);
    }
    if (pop == 0 || pop == 256) return 0.0;
    //use binary Shannon entropy formula 
    //p = probability that cell is alive 
    //q = probability that cell is dead
    float p = pop / 256.0;
    float q = 1 - p;
    //always zero or positive, use base 2 bcs binary 
    return -(p * log2(p) + q * log2(q));
}
 
void playTone(int freq, int durationMs) {
    ledcWriteTone(BUZZER_CH, freq);
    toneEnd = millis() + durationMs;
}

uint32_t stateHash(){
    uint32_t h = 0; 
    for (int r = 0; r < ROWS; r++){
        h ^= (grid[r] << r) | (grid[r] >> (32 - r));
    }
    return h;
}

bool isStagnant(){
    uint32_t h = stateHash();
    for (int i = 0; i < HASH_HISTORY; i++){
        if (hashHistory[i] == h) return true;
    }
    hashHistory[hashIndex] = h; 
    //HASH_HISTORY has a max value oof 6. wrap arnd after 
    hashIndex = (hashIndex + 1) % HASH_HISTORY;
    return false;
}

//seeding
void seedGrid(){
    int density = map(analogRead(POT_PIN), 0, 4095, 15, 55);
    for (int r = 0; r < ROWS; r++){
        grid[r] = 0; //wipes entire row, acts as a reset 
        for (int c = 0; c < COLS; c++){
            if (random(100) < density){
                grid[r] |= (1UL << c);
            }
        }
    }
    memset(hashHistory, 0, sizeof(hashHistory));
    hashIndex = 0; 
}

//session finalise
void finaliseSession(uint8_t reason) {
    SessionSummary s;
    // Average density over all generations this session
    s.density    = (genCount > 0) ? (uint8_t)(densityAcc / genCount)
                                  : (uint8_t)map(analogRead(POT_PIN), 0, 4095, 15, 55);
    s.peakPop    = peakPop;
    s.avgEntropy = (genCount > 0) ? (uint8_t)(entropyAcc / genCount) : 0;
    s.avgPBirth  = (genCount > 0) ? (uint8_t)(pBirthAcc  / genCount) : 0;  
    s.avgPDeath  = (genCount > 0) ? (uint8_t)(pDeathAcc  / genCount) : 0;  
    s.autocorr   = computeAutocorr(pBirthHistory, pBirthHistLen);
    s.generations = genCount;
    s.endReason  = reason;

    webAddSession(s);
    //main.cpp own copy of historyCount
    historyCount++;

    genCount       = 0;
    entropyAcc     = 0;
    peakPop        = 0;
    pBirthAcc      = 0;
    pDeathAcc      = 0;
    pBirthHistLen  = 0;   // reset per-session history
    densityAcc     = 0;
}

//rendering
void render() {
    mx.control(MD_MAX72XX::UPDATE, MD_MAX72XX::OFF);
    mx.clear();
    for (int r = 0; r < ROWS; r++) {
        uint32_t row = grid[r];
        mx.setRow(3, r, (row >> 0)  & 0xFF);
        mx.setRow(2, r, (row >> 8)  & 0xFF);
        mx.setRow(1, r, (row >> 16) & 0xFF);
        mx.setRow(0, r, (row >> 24) & 0xFF);
    }
    mx.control(MD_MAX72XX::UPDATE, MD_MAX72XX::ON);
}

//step generation 
void stepGeneration() {
    memset(next, 0, sizeof(next));

    for (int r = 0; r < ROWS; r++) {
        //wrap around y axis
        int above = (r - 1 + ROWS) % ROWS;
        int below = (r + 1) % ROWS;

        for (int c = 0; c < COLS; c++) {
            //wrap around x axis 
            int lc_ = (c - 1 + COLS) % COLS;
            int rc_ = (c + 1) % COLS;

            //only need to care about neighbours 
            int neighbours =
                ((grid[above] >> lc_) & 1) +
                ((grid[above] >> c)   & 1) +
                ((grid[above] >> rc_) & 1) +
                ((grid[r]     >> lc_) & 1) +
                ((grid[r]     >> rc_) & 1) +
                ((grid[below] >> lc_) & 1) +
                ((grid[below] >> c)   & 1) +
                ((grid[below] >> rc_) & 1);

            bool alive = (grid[r] >> c) & 1;

            if ((alive && (neighbours == 2 || neighbours == 3)) ||
                (!alive && neighbours == 3))
                //update bit c
                next[r] |= (1UL << c);
        }
    }

    // Birth/death counts, writing to globals
    totalBorn = 0;
    totalDied = 0;
    for (int r = 0; r < ROWS; r++) {
        totalBorn += __builtin_popcount(next[r] & ~grid[r]);
        totalDied += __builtin_popcount(grid[r] & ~next[r]);
    }
    // P(birth) and P(death) probabilities
    uint8_t alive_before = 0;
    for (int r = 0; r < ROWS; r++)
        alive_before += __builtin_popcount(grid[r]);  // grid[] not yet overwritten
    uint8_t dead_before = 256 - alive_before;

    float p_birth = (dead_before  > 0) ? (float)totalBorn / dead_before  : 0.0;
    float p_death = (alive_before > 0) ? (float)totalDied / alive_before : 0.0;

    // Buzzer
    if (totalBorn > totalDied) {
        //higher pitch when born
        playTone(1800, 40);
    }     
    else if (totalDied > totalBorn) {
        //lower pitch when death
        playTone(250, 40);
    }
    memcpy(grid, next, sizeof(grid));

    // Per-session tracking
    genCount++;
    float entropy = gridEntropy();
    entropyAcc += (uint32_t)(entropy * 100);
    pBirthAcc  += (uint32_t)(p_birth * 100);
    pDeathAcc  += (uint32_t)(p_death * 100);

    // Rolling P(birth) history for autocorr (cap at 200)
    if (pBirthHistLen < 200) {
        pBirthHistory[pBirthHistLen++] = p_birth;
    } else {
        memmove(pBirthHistory, pBirthHistory + 1, 199 * sizeof(float));
        pBirthHistory[199] = p_birth;
    }

    uint8_t pop = alive_before - totalDied + totalBorn;
    if (pop > peakPop) peakPop = pop;

    // Read density once, accumulate for average
    uint8_t curDensity = (uint8_t)map(analogRead(POT_PIN), 0, 4095, 15, 55);
    densityAcc += curDensity;

    // Push snapshot to web
    webUpdateData(
        pop,
        totalBorn,
        totalDied,
        entropy,
        p_birth,
        p_death,
        curDensity,
        sessionCount + 1,
        historyCount,
        simState == PAUSED
    );
}

void setup() {
    Serial.begin(115200);
    mx.begin();
    mx.control(MD_MAX72XX::INTENSITY, 4);
    mx.clear();
    randomSeed(analogRead(35));  // floating pin for entropy -> literal random number
    //basically taking random electromagnetic noise from environment (hand, power supply, RF interference)
    //will produce different number everytime (ADC noise sampling)
    ledcAttachPin(BUZZER_PIN, BUZZER_CH);
    webSetup();                  // start WiFi AP + server
    seedGrid();
    mx.clear();
}

void loop() {
    webHandle();  // always first — check for browser requests

    // Handle start request (from Run button)
    if (webStartRequested()) {
        webStartAck();
        sessionCount = 0;
        simState     = RUNNING;
        seedGrid();
    }

    // Handle stop request (pause mid-session without reseed)
    if (webStopRequested()) {
        webStopAck();
        simState = PAUSED;
        mx.clear();
        webUpdateState(true, sessionCount + 1, historyCount);
    }

    // Handle resume request (continue from paused state)
    if (webResumeRequested()) {
        webResumeAck();
        simState = RUNNING;
    }

    // Handle clear request from browser
    if (webClearRequested()) {
        webClearAck();
        historyCount  = 0;
        sessionCount  = 0;
        genCount      = 0;
        entropyAcc    = 0;
        peakPop       = 0;
        pBirthAcc     = 0;
        pDeathAcc     = 0;
        pBirthHistLen = 0;
        densityAcc    = 0;
        simState      = PAUSED;   // wait for manual restart
        mx.clear();               // blank the display
        webUpdateState(true, 1, 0); // push cleared state immediately
    }

    // Auto-stop tone
    if (toneEnd > 0 && millis() > toneEnd) {
        ledcWriteTone(BUZZER_CH, 0);
        toneEnd = 0;
    }

    // Only run simulation if not paused
    if (simState != RUNNING) return;

    int potVal   = analogRead(POT_PIN);
    int genDelay = map(potVal, 0, 4095, 50, 300);

    if (millis() - lastGen >= genDelay) {
        stepGeneration();
        render();

        if (isStagnant()) {
            ledcWriteTone(BUZZER_CH, 0);
            finaliseSession(0);
            sessionCount++;

            if (webRunRemaining() > 0) {
                // Run-N mode: decrement and auto-continue or stop
                webDecrementRun();
                if (webRunRemaining() > 0) {
                    delay(500);
                    seedGrid();
                } else {
                    simState = PAUSED;   // batch complete
                    mx.clear();
                    webUpdateState(true, sessionCount + 1, historyCount);
                }
            } else if (sessionCount >= 5 || historyCount >= 30) {
                simState = PAUSED;
                mx.clear();
                webUpdateState(true, sessionCount + 1, historyCount);
            } else {
                delay(500);
                seedGrid();
            }
        }

        lastGen = millis();
    }
}