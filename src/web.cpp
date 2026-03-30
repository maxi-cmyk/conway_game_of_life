#include "web.h"

#include <Arduino.h>
#include <WebServer.h>
#include <WiFi.h>

#include "credentials.h"

#if defined(WIFI_SSID) && defined(WIFI_PASSWORD)
static constexpr const char* WIFI_NAME = WIFI_SSID;
static constexpr const char* WIFI_SECRET = WIFI_PASSWORD;
#elif defined(AP_SSID) && defined(AP_PASSWORD)
static constexpr const char* WIFI_NAME = AP_SSID;
static constexpr const char* WIFI_SECRET = AP_PASSWORD;
#else
#error "Define WIFI_SSID/WIFI_PASSWORD in credentials.h before building."
#endif

static constexpr int SERVER_PORT = 80;
static constexpr int MAX_HISTORY = 30;

static WebServer server(SERVER_PORT);

static uint8_t  s_pop           = 0;
static uint32_t s_born          = 0;
static uint32_t s_died          = 0;
static float    s_entropy       = 0.0f;
static uint8_t  s_density       = 0;
static int      s_session       = 0;
static int      s_batchTarget   = 0;
static int      s_totalSessions = 0;
static String   s_stateStr      = "IDLE";
static float    s_pBirth        = 0.0f;
static float    s_pDeath        = 0.0f;

static SessionSummary s_history[MAX_HISTORY];
static int s_historyCount = 0;

static bool s_startFlag    = false;
static bool s_clearFlag    = false;
static bool s_pauseFlag    = false;
static bool s_resumeFlag   = false;
static int  s_runRemaining = 0;

static void addCorsHeaders() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
}

static void sendOk() {
    addCorsHeaders();
    server.send(200, "text/plain", "ok");
}

static void handleData() {
    addCorsHeaders();

    String json;
    json.reserve(160);
    json += "{";
    json += "\"pop\":"           + String(s_pop) + ",";
    json += "\"born\":"          + String(s_born) + ",";
    json += "\"died\":"          + String(s_died) + ",";
    json += "\"entropy\":"       + String(s_entropy, 2) + ",";
    json += "\"pBirth\":"        + String(s_pBirth, 3) + ",";
    json += "\"pDeath\":"        + String(s_pDeath, 3) + ",";
    json += "\"density\":"       + String(s_density) + ",";
    json += "\"session\":"       + String(s_session) + ",";
    json += "\"batchTarget\":"   + String(s_batchTarget) + ",";
    json += "\"totalSessions\":" + String(s_totalSessions) + ",";
    json += "\"state\":\""       + s_stateStr + "\"";
    json += "}";

    server.send(200, "application/json", json);
}

static void handleHistory() {
    addCorsHeaders();

    String json;
    json.reserve(64 + (s_historyCount * 128));
    json = "{\"sessions\":[";

    for (int i = 0; i < s_historyCount; i++) {
        if (i > 0) {
            json += ",";
        }

        json += "{";
        json += "\"density\":"     + String(s_history[i].density) + ",";
        json += "\"peakPop\":"     + String(s_history[i].peakPop) + ",";
        json += "\"avgEntropy\":"  + String(s_history[i].avgEntropy) + ",";
        json += "\"avgPBirth\":"   + String(s_history[i].avgPBirth) + ",";
        json += "\"avgPDeath\":"   + String(s_history[i].avgPDeath) + ",";
        json += "\"autocorr\":"    + String(s_history[i].autocorr) + ",";
        json += "\"generations\":" + String(s_history[i].generations) + ",";
        json += "\"endReason\":"   + String(s_history[i].endReason);
        json += "}";
    }

    json += "]}";
    server.send(200, "application/json", json);
}

static void handleRun() {
    int count = server.hasArg("count") ? server.arg("count").toInt() : 0;
    if (count < 5) {
        count = 5;
    }
    if (count > 30) {
        count = 30;
    }

    s_runRemaining = count;
    s_startFlag = true;
    sendOk();
}

static void handleRestart() {
    s_startFlag = true;
    sendOk();
}

void webSetup() {
    WiFi.mode(WIFI_STA);
    IPAddress local(192, 168, 50, 100);
    IPAddress gateway(192, 168, 50, 1);
    IPAddress subnet(255, 255, 255, 0);
    IPAddress dns(8, 8, 8, 8);

    WiFi.config(local, gateway, subnet, dns);
    WiFi.begin(WIFI_NAME, WIFI_SECRET);

    Serial.print("Connecting");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }

    Serial.println();
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());

    server.on("/data", HTTP_GET, handleData);
    server.on("/history", HTTP_GET, handleHistory);

    server.on("/restart", HTTP_POST, handleRestart);
    server.on("/run", HTTP_POST, handleRun);

    server.on("/pause", HTTP_POST, []() {
        s_pauseFlag = true;
        sendOk();
    });

    server.on("/resume", HTTP_POST, []() {
        s_resumeFlag = true;
        sendOk();
    });

    server.on("/clear", HTTP_POST, []() {
        s_clearFlag = true;
        s_runRemaining = 0;
        sendOk();
    });

    server.onNotFound([]() {
        server.send(404, "text/plain", "Not found");
    });

    server.begin();
}

void webHandle() {
    server.handleClient();
}

void webUpdateData(
    uint8_t  pop,
    uint32_t born,
    uint32_t died,
    float    entropy,
    float    pBirth,
    float    pDeath,
    uint8_t  density,
    int      session,
    int      batchTarget,
    int      totalSessions,
    const String& state
) {
    s_pop           = pop;
    s_born          = born;
    s_died          = died;
    s_entropy       = entropy;
    s_pBirth        = pBirth;
    s_pDeath        = pDeath;
    s_density       = density;
    s_session       = session;
    s_batchTarget   = batchTarget;
    s_totalSessions = totalSessions;
    s_stateStr      = state;
}

void webUpdateState(const String& state, int session, int batchTarget, int totalSessions, uint8_t density) {
    s_stateStr      = state;
    s_session       = session;
    s_batchTarget   = batchTarget;
    s_totalSessions = totalSessions;
    s_density       = density;
}

void webAddSession(SessionSummary s) {
    if (s_historyCount >= MAX_HISTORY) {
        return;
    }

    s_history[s_historyCount++] = s;
}

void webStartAck() {
    s_startFlag = false;
}

void webClearAck() {
    s_clearFlag = false;
    s_historyCount = 0;
    memset(s_history, 0, sizeof(s_history));
}

bool webPauseRequested() {
    return s_pauseFlag;
}

void webPauseAck() {
    s_pauseFlag = false;
}

bool webResumeRequested() {
    return s_resumeFlag;
}

void webResumeAck() {
    s_resumeFlag = false;
}

bool webStartRequested() {
    return s_startFlag;
}

bool webClearRequested() {
    return s_clearFlag;
}

int webRunRemaining() {
    return s_runRemaining;
}

void webDecrementRun() {
    if (s_runRemaining > 0) {
        s_runRemaining--;
    }
}
