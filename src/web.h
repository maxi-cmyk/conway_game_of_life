//#pragma once prevents this file to be included > 1 time
//standard practice for .h files 

#pragma once
#include <stdint.h>

struct SessionSummary {
    uint8_t density; //current density 
    uint8_t peakPop; //max population
    uint8_t avgEntropy; //mean entropy 
    uint16_t generations; //how gens this lasted
    uint8_t endReason; //0 = stagnant, 1 = death 
    uint8_t  avgPBirth;   // mean P(birth) × 100
    uint8_t  avgPDeath;   // mean P(death) × 100
    int8_t   autocorr;    // computed browser side, stored back via endpoint
}; 

void webSetup();

void webHandle();

void webUpdateData(
    uint8_t pop, 
    uint32_t born,
    uint32_t died,
    float entropy, 
    float p_birth, 
    float p_death,
    uint8_t density, //[15, 55]%
    int session, 
    int totalSessions, 
    bool paused
);

// Updates just state and session counters (for pausing/clearing)
void webUpdateState(bool paused, int session, int totalSessions);

//main.cpp calls this when session ends
void webAddSession(SessionSummary s);

//user requests, main.cpp polls to check if pressed
bool webStartRequested();
bool webClearRequested();

//server acknowledged, main.cpp calls after acknowledged
void webStartAck();
void webClearAck();

// Stop/Resume (pause mid-session without reseed)
bool webStopRequested();
void webStopAck();
bool webResumeRequested();
void webResumeAck();

// Run-N batch mode
int  webRunRemaining();
void webDecrementRun();

