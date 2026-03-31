#include "web.h"

#include <Arduino.h>
#include <AsyncTCP.h>
#include <ArduinoJson.h>
#include <ESPAsyncWebServer.h>
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
static constexpr uint8_t DEFAULT_BRIGHTNESS = 4;
static constexpr uint16_t DEFAULT_MAX_GENS = 400;
static constexpr uint8_t DEFAULT_HASH_HISTORY = 6;
static constexpr uint8_t MIN_BRIGHTNESS = 0;
static constexpr uint8_t MAX_BRIGHTNESS = 15;
static constexpr uint16_t MIN_MAX_GENS = 50;
static constexpr uint16_t MAX_MAX_GENS = 2000;
static constexpr uint8_t MIN_HASH_HISTORY = 2;
static constexpr uint8_t MAX_HASH_HISTORY = 12;

static AsyncWebServer server(SERVER_PORT);
static AsyncEventSource events("/events");

static uint8_t  s_pop           = 0;
static uint32_t s_born          = 0;
static uint32_t s_died          = 0;
static float    s_entropy       = 0.0f;
static uint8_t  s_density       = 0;
static int      s_session       = 0;
static int      s_batchTarget   = 0;
static int      s_totalSessions = 0;
static uint8_t  s_brightness    = DEFAULT_BRIGHTNESS;
static uint16_t s_maxGens       = DEFAULT_MAX_GENS;
static uint8_t  s_hashHistory   = DEFAULT_HASH_HISTORY;
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

static String s_lastSnapshotJson;
static String s_lastSettingsJson;

static String buildSnapshotJson() {
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
    json += "\"maxGens\":"       + String(s_maxGens) + ",";
    json += "\"state\":\""       + s_stateStr + "\"";
    json += "}";

    return json;
}

static String buildSettingsJson() {
    String json;
    json.reserve(64);
    json += "{";
    json += "\"brightness\":"  + String(s_brightness) + ",";
    json += "\"maxGens\":"     + String(s_maxGens) + ",";
    json += "\"hashHistory\":" + String(s_hashHistory);
    json += "}";

    return json;
}

static String buildHistoryJson() {
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
    return json;
}

static void sendText(AsyncWebServerRequest* request, int status, const char* type, const char* body) {
    request->send(status, type, body);
}

static void sendJson(AsyncWebServerRequest* request, const String& json) {
    request->send(200, "application/json", json);
}

static void sendOk(AsyncWebServerRequest* request) {
    sendText(request, 200, "text/plain", "ok");
}

static void pushSnapshotEventIfChanged() {
    String json = buildSnapshotJson();

    if (json == s_lastSnapshotJson) {
        return;
    }

    s_lastSnapshotJson = json;
    events.send(json.c_str(), "snapshot", millis());
}

static void pushSettingsEventIfChanged() {
    String json = buildSettingsJson();

    if (json == s_lastSettingsJson) {
        return;
    }

    s_lastSettingsJson = json;
    events.send(json.c_str(), "settings", millis());
}

static void handleRun(AsyncWebServerRequest* request) {
    int count = request->hasParam("count") ? request->getParam("count")->value().toInt() : 0;
    if (count < 3) {
        count = 3;
    }
    if (count > 30) {
        count = 30;
    }

    s_runRemaining = count;
    s_startFlag = true;
    sendOk(request);
}

static void handleRestart(AsyncWebServerRequest* request) {
    s_startFlag = true;
    sendOk(request);
}

static void handleSettingsUpdateBody(AsyncWebServerRequest* request, uint8_t* data, size_t len, size_t index, size_t total) {
    if (index == 0) {
        String* body = new String();

        if (body == nullptr) {
            request->_tempObject = nullptr;
            request->send(500, "text/plain", "Memory error");
            return;
        }

        body->reserve(total);
        request->_tempObject = body;
    }

    String* body = reinterpret_cast<String*>(request->_tempObject);
    if (body == nullptr) {
        request->send(500, "text/plain", "Memory error");
        return;
    }

    body->concat(reinterpret_cast<const char*>(data), len);

    if (index + len < total) {
        return;
    }

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, *body);

    delete body;
    request->_tempObject = nullptr;

    if (!error) {
        if (doc["brightness"].is<int>()) {
            int nextBrightness = doc["brightness"].as<int>();

            if (nextBrightness < MIN_BRIGHTNESS) {
                nextBrightness = MIN_BRIGHTNESS;
            }

            if (nextBrightness > MAX_BRIGHTNESS) {
                nextBrightness = MAX_BRIGHTNESS;
            }

            s_brightness = (uint8_t)nextBrightness;
        }

        if (doc["maxGens"].is<int>()) {
            int nextMaxGens = doc["maxGens"].as<int>();

            if (nextMaxGens < MIN_MAX_GENS) {
                nextMaxGens = MIN_MAX_GENS;
            }

            if (nextMaxGens > MAX_MAX_GENS) {
                nextMaxGens = MAX_MAX_GENS;
            }

            s_maxGens = (uint16_t)nextMaxGens;
        }

        if (doc["hashHistory"].is<int>()) {
            int nextHashHistory = doc["hashHistory"].as<int>();

            if (nextHashHistory < MIN_HASH_HISTORY) {
                nextHashHistory = MIN_HASH_HISTORY;
            }

            if (nextHashHistory > MAX_HASH_HISTORY) {
                nextHashHistory = MAX_HASH_HISTORY;
            }

            s_hashHistory = (uint8_t)nextHashHistory;
        }
    }

    pushSettingsEventIfChanged();
    sendJson(request, buildSettingsJson());
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

    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "Content-Type");

    events.onConnect([](AsyncEventSourceClient* client) {
        String snapshot = buildSnapshotJson();
        String settings = buildSettingsJson();
        s_lastSnapshotJson = snapshot;
        s_lastSettingsJson = settings;
        client->send(snapshot.c_str(), "snapshot", millis());
        client->send(settings.c_str(), "settings", millis());
    });

    server.addHandler(&events);

    server.on("/data", HTTP_GET, [](AsyncWebServerRequest* request) {
        sendJson(request, buildSnapshotJson());
    });

    server.on("/history", HTTP_GET, [](AsyncWebServerRequest* request) {
        sendJson(request, buildHistoryJson());
    });

    server.on("/settings", HTTP_GET, [](AsyncWebServerRequest* request) {
        sendJson(request, buildSettingsJson());
    });

    server.on("/settings", HTTP_OPTIONS, [](AsyncWebServerRequest* request) {
        request->send(204);
    });

    server.on("/settings", HTTP_POST, [](AsyncWebServerRequest* request) {}, nullptr, handleSettingsUpdateBody);

    server.on("/restart", HTTP_POST, handleRestart);
    server.on("/run", HTTP_POST, handleRun);

    server.on("/pause", HTTP_POST, [](AsyncWebServerRequest* request) {
        s_pauseFlag = true;
        sendOk(request);
    });

    server.on("/resume", HTTP_POST, [](AsyncWebServerRequest* request) {
        s_resumeFlag = true;
        sendOk(request);
    });

    server.on("/clear", HTTP_POST, [](AsyncWebServerRequest* request) {
        s_clearFlag = true;
        s_runRemaining = 0;
        sendOk(request);
    });

    server.onNotFound([](AsyncWebServerRequest* request) {
        request->send(404, "text/plain", "Not found");
    });

    server.begin();
}

void webHandle() {
    // Async web server handles requests outside the main loop.
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
    pushSnapshotEventIfChanged();
}

void webUpdateState(const String& state, int session, int batchTarget, int totalSessions, uint8_t density) {
    s_stateStr      = state;
    s_session       = session;
    s_batchTarget   = batchTarget;
    s_totalSessions = totalSessions;
    s_density       = density;
    pushSnapshotEventIfChanged();
}

void webAddSession(SessionSummary s) {
    if (s_historyCount >= MAX_HISTORY) {
        return;
    }

    s_history[s_historyCount++] = s;
}

void webRestoreHistory(const SessionSummary* sessions, int count) {
    if (count < 0) {
        count = 0;
    }

    if (count > MAX_HISTORY) {
        count = MAX_HISTORY;
    }

    memset(s_history, 0, sizeof(s_history));

    if (sessions != nullptr && count > 0) {
        memcpy(s_history, sessions, count * sizeof(SessionSummary));
    }

    s_historyCount = count;
}

void webCopyHistory(SessionSummary* out, int maxCount) {
    if (out == nullptr || maxCount <= 0) {
        return;
    }

    int count = s_historyCount;
    if (count > maxCount) {
        count = maxCount;
    }

    memcpy(out, s_history, count * sizeof(SessionSummary));
}

int webHistoryCount() {
    return s_historyCount;
}

void webUpdateConfig(uint8_t brightness, uint16_t maxGens, uint8_t hashHistory) {
    s_brightness = brightness;
    s_maxGens = maxGens;
    s_hashHistory = hashHistory;
    pushSettingsEventIfChanged();
}

uint8_t webBrightness() {
    return s_brightness;
}

uint16_t webMaxGens() {
    return s_maxGens;
}

uint8_t webHashHistory() {
    return s_hashHistory;
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
