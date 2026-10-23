#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ---------- WIFI ----------
const char* WIFI_SSID = "Dhruvam's Galaxy M31s";
const char* WIFI_PASSWORD = "hizs9370";

// Replace with your computer's CURRENT IPv4 address
const char* SERVER_URL =
  "http://10.71.204.108:8000/api/hardware/test-seats";

// Must match the backend's ESP32_API_KEY
const char* DEVICE_KEY =
  "SmartLibrary_ESP32_2026_SecureKey_9x7Q";

const char* DEVICE_ID = "smart-library-esp32-01";

// ---------- RFID ----------
#define SS_PIN 21
#define RST_PIN 22
MFRC522 rfid(SS_PIN, RST_PIN);

// ---------- BUTTONS ----------
#define SEAT_1_BUTTON 32
#define SEAT_2_BUTTON 27

// ---------- OLED ----------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

Adafruit_SSD1306 display(
  SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1
);

unsigned long lastUpload = 0;
const unsigned long UPLOAD_INTERVAL = 2000;

// ---------- OLED ----------
void showScreen(String line1, String line2, String line3) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  display.setCursor(0, 5);
  display.println(line1);

  display.setCursor(0, 25);
  display.println(line2);

  display.setCursor(0, 45);
  display.println(line3);

  display.display();
}

// ---------- RFID UID ----------
String getUID() {
  String uid = "";

  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) {
      uid += "0";
    }

    uid += String(rfid.uid.uidByte[i], HEX);

    if (i < rfid.uid.size - 1) {
      uid += ":";
    }
  }

  uid.toUpperCase();
  return uid;
}

// ---------- WIFI ----------
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  showScreen("Connecting WiFi", "Please wait", "");

  Serial.print("Connecting to WiFi");

  unsigned long start = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected");
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());

    showScreen(
      "WiFi Connected",
      WiFi.localIP().toString(),
      "Library Ready"
    );
    delay(1500);
  } else {
    Serial.println("WiFi connection failed");
    showScreen("WiFi Failed", "Check credentials", "");
  }
}

// ---------- BACKEND SEAT SYNC ----------
void sendSeatStatus(bool seat1Occupied,
                    bool seat2Occupied) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected; reconnecting");
    WiFi.reconnect();
    return;
  }

  HTTPClient http;
  http.setTimeout(3000);

  if (!http.begin(SERVER_URL)) {
    Serial.println("HTTP initialization failed");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);

  // Exact fields expected by SeatTestStatus in main.py
  String payload = "{";
  payload += "\"device_id\":\"";
  payload += DEVICE_ID;
  payload += "\",\"seat_a_occupied\":";
  payload += (seat1Occupied ? "true" : "false");
  payload += ",\"seat_b_occupied\":";
  payload += (seat2Occupied ? "true" : "false");
  payload += "}";

  Serial.println("Uploading seat status...");
  Serial.println(payload);

  int code = http.POST(payload);

  if (code > 0) {
    Serial.printf("HTTP status: %d\n", code);
    Serial.println(http.getString());
  } else {
    Serial.print("HTTP error: ");
    Serial.println(http.errorToString(code));
  }

  http.end();
}

// ---------- SETUP ----------
void setup() {
  Serial.begin(115200);

  pinMode(SEAT_1_BUTTON, INPUT_PULLUP);
  pinMode(SEAT_2_BUTTON, INPUT_PULLUP);

  Wire.begin(16, 17);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED NOT FOUND");
    while (true) delay(1000);
  }

  SPI.begin(18, 19, 23, SS_PIN);
  rfid.PCD_Init();

  showScreen("LIBRARY SYSTEM", "Starting...", "");
  connectWiFi();

  showScreen("LIBRARY SYSTEM", "Hardware Ready",
             "Scan RFID Tag");
}

// ---------- MAIN LOOP ----------
void loop() {
  bool seat1Occupied =
      digitalRead(SEAT_1_BUTTON) == LOW;

  bool seat2Occupied =
      digitalRead(SEAT_2_BUTTON) == LOW;

  String seat1Status = seat1Occupied
      ? "Seat 1: OCCUPIED"
      : "Seat 1: AVAILABLE";

  String seat2Status = seat2Occupied
      ? "Seat 2: OCCUPIED"
      : "Seat 2: AVAILABLE";

  showScreen("LIBRARY SYSTEM",
             seat1Status,
             seat2Status);

  // Upload both physical readings every two seconds
  if (millis() - lastUpload >= UPLOAD_INTERVAL) {
    lastUpload = millis();
    sendSeatStatus(seat1Occupied, seat2Occupied);
  }

  // RFID verification remains local in this version
  if (rfid.PICC_IsNewCardPresent() &&
      rfid.PICC_ReadCardSerial()) {

    String uid = getUID();

    Serial.print("Scanned UID: ");
    Serial.println(uid);

    if (uid == "13:ED:8B:C5") {
      showScreen("RFID VERIFIED",
                 "Student A",
                 "Welcome");
    }
    else if (uid == "B3:61:D5:FA") {
      showScreen("RFID VERIFIED",
                 "Student B",
                 "Welcome");
    }
    else {
      showScreen("ACCESS DENIED",
                 "Unknown RFID",
                 "Not registered");
    }

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();

    delay(1500);
  }

  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
  }

  delay(100);
}