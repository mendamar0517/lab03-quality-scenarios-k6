# Lab 03 --- Quality Scenarios → SLO → k6 Threshold

**Оюутан:** О.Мэнд-Амар
**Оюутны код:** B232270001
**Лаборатори:** Lab 03 --- Quality Scenarios and SLO Threshold Testing

---

## 1. Лабораторийн зорилго

Энэхүү лабораторийн ажлын зорилго нь Lecture 3-т үзсэн Quality Scenario
ойлголтыг ашиглан системийн Performance, Reliability, Availability
чанарын шаардлагуудыг тодорхойлох, тэдгээрийг SLO болгон хувиргах,
улмаар k6 threshold ашиглан автоматаар шалгах явдал юм.

Хэрэгжүүлсэн бүрэн pipeline:

```text
Quality Scenario
      ↓
SLO
      ↓
k6 Threshold
      ↓
PASS / FAIL
      ↓
Chaos Experiment
      ↓
Evidence and Analysis
```

Туршилтыг зөвхөн өөрийн локал API дээр хийсэн.

---

## 2. Орчны мэдээлэл

### Operating Environment

- Operating System: macOS
- API runtime: Node.js
- API framework: Express
- Load testing tool: k6
- Test target: `http://localhost:3000`
- Maximum normal test load: 20 VUs

### k6 Version

```text
k6 v2.2.0 (commit/devel, go1.26.5, darwin/arm64)
```

Version-ийн output: `results/k6-version.txt`

---

## 3. Төслийн бүтэц

```text
lab03/
├── README.md
├── .gitignore
├── package.json
├── package-lock.json
├── server.js
├── slo-test.js
├── slo-test-fail.js
├── results/
│   ├── pass.txt
│   ├── chaos.txt
│   ├── fail.txt
│   └── k6-version.txt
└── docs/
```

`node_modules/` болон `.DS_Store` нь `.gitignore`-д орсон.

---

# 4. Local API

Лабораторийн туршилтад Node.js + Express дээр суурилсан локал API
ашигласан.

Method Endpoint Үүрэг

---

POST `/cart/add` Cart-д item нэмэх
GET `/report` Report боловсруулах
POST `/pay` Payment хийх

### `/cart/add`

Амжилттай response:

```json
{
  "ok": true,
  "items": 1
}
```

### `/report`

Endpoint нь зориудаар 200--400ms орчим delay үүсгэнэ:

```javascript
await sleep(200 + Math.random() * 200);
```

Response:

```json
{
  "rows": 20000
}
```

### `/pay`

Payment endpoint нь зориудаар ойролцоогоор 5%-ийн failure
probability-тэй:

```javascript
if (Math.random() < 0.05)
  return res.status(500).json({ error: "gateway timeout" });
```

---

# 5. Quality Scenarios

Scenario бүр Lecture 3-ын дараах 6 хэсгээр тодорхойлогдсон:

1.  Overview
2.  System state
3.  Environment state
4.  External stimulus
5.  Required response
6.  Response measure

## 5.1 Performance Scenario --- `/cart/add`

---

Scenario хэсэг Тодорхойлолт

---

**Overview** Cart-д item нэмэх үйлдэл хэвийн
ачааллын үед хурдан response өгөх
ёстой.

**System state** Local API ажиллаж байгаа бөгөөд
`/cart/add` endpoint request хүлээн
авахад бэлэн байна.

**Environment state** macOS дээр Node.js + Express API
ажиллаж байна. k6 нь 20 VUs
ашиглана.

**External stimulus** 20 concurrent VUs хэвийн ачааллын
үед `POST /cart/add` request
илгээнэ. Test window нь 1 минут.

**Required response** Request бүр HTTP 200 response
буцаах ёстой.

**Response measure** `/cart/add` response latency-ийн
p95 нь 50ms-ээс бага байна. Мөн
`cart 200` check-ээр амжилтыг
шалгана.

---

### Performance SLO

```text
SLI: http_req_duration{name:cart}
SLO: p95 < 50ms
Load: 20 VUs
Window: 1 minute
```

---

## 5.2 Reliability Scenario --- `/pay`

---

Scenario хэсэг Тодорхойлолт

---

**Overview** Payment үйлдлийг хэвийн ажиллагааны
үед тогтвортой боловсруулж,
failure-ийн давтамжийг хязгаарлах
ёстой.

**System state** Local API ажиллаж байгаа бөгөөд
`/pay` endpoint request хүлээн
авахад бэлэн байна.

**Environment state** macOS дээр Node.js + Express API
ажиллаж байна. k6 нь 20 VUs
ашиглана.

**External stimulus** 20 VUs 1 минутын турш хэвийн
payment request илгээнэ.

**Required response** Payment request-үүдийн failure rate
зөвшөөрөгдөх хязгаараас бага байна.

**Response measure** `/pay` endpoint-ийн HTTP request
failure rate 8%-аас бага байна.

---

### Reliability SLO

```text
SLI: http_req_failed{name:pay}
SLO: error rate < 8%
Load: 20 VUs
Window: 1 minute
```

`/pay` endpoint нь зориудаар ойролцоогоор 5%-ийн failure probability
үүсгэдэг тул 8%-ийн threshold сонгосон.

---

## 5.3 Availability Scenario --- API Server Failure

---

Scenario хэсэг Тодорхойлолт

---

**Overview** Server failure гарсан үед системийн
availability болон recovery
behavior-ийг шалгана.

**System state** Local API хэвийн ажиллаж, k6-ээс
ирэх request-үүдийг боловсруулж
байна.

**Environment state** macOS localhost орчинд Node.js +
Express server ажиллаж байна. k6 нь
20 VUs-тай 2 минут ажиллана.

**External stimulus** API server-ийг зориудаар зогсоож,
ойролцоогоор 10 секундын дараа
дахин асаана.

**Required response** Failure үед request failures
ажиглагдаж, server restart хийсний
дараа систем дахин request
боловсруулах боломжтой болно.

**Response measure** Availability percentage, failure
detection/recovery behavior болон
request/check-based availability
хэмжинэ. Availability SLO нь ≥90%.

---

### Availability SLO

```text
SLI: successful request/check rate
SLO: availability ≥ 90%
Load: 20 VUs
Window: 2 minutes
Failure duration: approximately 10 seconds
```

---

# 6. Scenario → SLO → Threshold

---

Quality SLI SLO k6 Threshold Window / Load
Attribute

---

Performance `/cart/add` p95 p95 \< 50ms `p(95)<50` 20 VUs / 1 min
latency

Reliability `/pay` error \< 8% `rate<0.08` 20 VUs / 1 min
rate

Availability successful ≥ 90% `rate>0.90` 20 VUs / 2 min
checks/request  
 rate

Supporting `/report` p95 p95 \< 450ms `p(95)<450` 20 VUs / 1 min
Performance latency

---

README-д тодорхойлсон үндсэн threshold болон `slo-test.js` доторх
threshold-ууд ижил.

---

# 7. Threshold сонгосон үндэслэл

### `/cart/add` --- p95 \< 50ms

`/cart/add` нь localhost дээр бага latency-тэй энгийн endpoint тул
50ms-ийн p95 threshold ашигласан.

PASS test-ийн actual result:

```text
p(95) = 1.61ms
```

### `/pay` --- error rate \< 8%

`/pay` endpoint нь зориудаар ойролцоогоор 5%-ийн failure probability
үүсгэдэг. Тиймээс 8%-ийн error-rate threshold сонгосон.

PASS test-ийн actual result:

```text
error rate = 6.01%
```

### Availability --- ≥ 90%

Availability scenario-д 90%-ийн SLO ашигласан.

```text
2 minutes = 120 seconds
100% - 90% = 10%
120 × 0.10 = 12 seconds
```

Иймээс 2 минутын window-ийн time-based error budget нь **12 seconds**.

### `/report` --- p95 \< 450ms

`/report` endpoint нь 200--400ms орчим delay үүсгэдэг тул p95 \< 450ms
threshold сонгосон.

---

# 8. k6 Threshold Implementation

`slo-test.js` файлд:

```javascript
export const options = {
  vus: 20,
  duration: "1m",

  thresholds: {
    "http_req_duration{name:cart}": ["p(95)<50"],
    "http_req_failed{name:pay}": ["rate<0.08"],
    checks: ["rate>0.90"],
    "http_req_duration{name:report}": ["p(95)<450"],
  },
};
```

Endpoint бүрийг тусгай tag ашиглан ялгасан:

```javascript
{
  tags: {
    name: "cart";
  }
}
{
  tags: {
    name: "report";
  }
}
{
  tags: {
    name: "pay";
  }
}
```

---

# 9. PASS Test

```bash
k6 run slo-test.js 2>&1 | tee results/pass.txt
```

Configuration:

```text
VUs: 20
Duration: 1 minute
```

### Actual threshold results

```text
checks
✓ 'rate>0.90' rate=97.99%

http_req_duration{name:cart}
✓ 'p(95)<50' p(95)=1.61ms

http_req_duration{name:report}
✓ 'p(95)<450' p(95)=389.16ms

http_req_failed{name:pay}
✓ 'rate<0.08' rate=6.01%
```

### Summary

Metric Actual Threshold Result

---

Checks 97.99% \> 90% PASS
Cart p95 1.61ms \< 50ms PASS
Report p95 389.16ms \< 450ms PASS
Pay error rate 6.01% \< 8% PASS

Additional results:

```text
Iterations: 931
HTTP requests: 2793
Failed HTTP requests: 56
```

Бүрэн output: `results/pass.txt`

---

# 10. Chaos Experiment

Availability scenario-г шалгахын тулд 2 минутын k6 test ажиллаж байх үед
API server-ийг зориудаар зогсоосон.

### Experiment

1.  API server ажиллуулсан.
2.  k6 test-ийг 20 VUs, 2 minutes-аар эхлүүлсэн.
3.  Test ажиллаж байх үед server-ийг Ctrl+C ашиглан зогсоосон.
4.  Server-ийг ойролцоогоор 10 секунд унтраалттай байлгасан.
5.  Server-ийг дахин асаасан.
6.  k6 test 2 минут дуустал үргэлжилсэн.

---

# 11. Chaos Test Results

Бүрэн output: `results/chaos.txt`

### Actual threshold results

```text
checks
✗ 'rate>0.90' rate=76.94%

http_req_duration{name:cart}
✓ 'p(95)<50' p(95)=1.84ms

http_req_duration{name:report}
✓ 'p(95)<450' p(95)=388.24ms

http_req_failed{name:pay}
✗ 'rate<0.08' rate=26.10%
```

Chaos test-ийн үед availability болон `/pay` reliability threshold
хоёулаа зөрчигдсөн.

---

# 12. Request-Based Availability Calculation

Chaos test-ийн actual HTTP statistics:

```text
Total requests = 5826
Failed requests = 1343
Successful requests = 4483
```

Availability:

```text
Availability =
Successful requests / Total requests × 100%

= 4483 / 5826 × 100%

= 76.94%
```

Иймээс:

```text
Actual availability = 76.94%
Required SLO = ≥ 90%
```

Үр дүн:

```text
76.94% < 90%
```

→ Availability threshold **FAIL**.

---

# 13. Time-Based Error Budget ба Request-Based Availability

Availability SLO:

```text
≥ 90%
```

2 минут:

```text
120 seconds
```

Time-based error budget:

```text
120 × (1 - 0.90)
= 12 seconds
```

Иймээс time-based availability error budget нь **12 seconds**.

Chaos experiment-д server ойролцоогоор 10 секунд зогссон.

Гэхдээ request-based availability нь хугацаагаар бус request-ийн үр
дүнгээр хэмжигддэг:

```text
successful requests / total requests
```

Server унтарсан үед failed request-үүд хурдан буцаж болох тул 10
секундийн outage-ийн хугацаанд олон failed request үүсч болно.

Иймээс 12 секундийн time-based error budget болон 76.94%-ийн
request-based availability нь ижил хэмжүүр биш.

---

# 14. Reliability ба Availability-ийн ялгаа

PASS test-ийн үед `/pay` error rate:

```text
6.01%
```

байсан.

```text
6.01% < 8%
```

тул reliability SLO PASS болсон.

Chaos үед server бүхэлдээ унтарсан тул `/pay` request-үүд мөн failed
болсон:

```text
/pay failed = 507 / 1942
```

Тооцоолол:

```text
507 / 1942 × 100% = 26.10%
```

Иймээс:

```text
26.10% > 8%
```

тул `/pay` reliability threshold chaos test-ийн үед FAIL болсон.

Reliability нь хэвийн ажиллагааны үед failure хэр олон гарч байгааг
хэмждэг бол availability нь failure гарсан үед системийн ажиллах боломж
болон recovery behavior-тэй холбоотой.

---

# 15. Deliberate FAIL Test

Threshold механизм зөв ажиллаж байгааг шалгахын тулд зориудаар FAIL
үүсгэсэн.

`slo-test-fail.js` нь `slo-test.js`-ээс хуулбарлагдсан бөгөөд `/report`
threshold-ийг:

```text
p(95)<450
```

байсныг:

```text
p(95)<100
```

болгосон.

`/report` endpoint нь 200--400ms орчим delay үүсгэдэг тул 100ms
threshold зориудаар хэт хатуу босго болсон.

---

# 16. Deliberate FAIL Results

```bash
k6 run slo-test-fail.js 2>&1 | tee results/fail.txt
```

Actual result:

```text
http_req_duration{name:report}
✗ 'p(95)<100' p(95)=391.74ms
```

Бусад threshold энэ test-ийн үед PASS болсон:

```text
checks
✓ 'rate>0.90' rate=98.31%

http_req_duration{name:cart}
✓ 'p(95)<50' p(95)=1.63ms

http_req_failed{name:pay}
✓ 'rate<0.08' rate=5.05%
```

### Summary

Metric Actual Threshold Result

---

Report p95 391.74ms \< 100ms FAIL
Checks 98.31% \> 90% PASS
Cart p95 1.63ms \< 50ms PASS
Pay error rate 5.05% \< 8% PASS

k6 threshold failure message:

```text
thresholds on metrics 'http_req_duration{name:report}' have been crossed
```

---

# 17. k6 Exit Code

FAIL test-ийн exit code-ийг `pipefail` ашиглан шалгасан:

```bash
set -o pipefail; k6 run slo-test-fail.js 2>&1 | tee results/fail.txt; echo "exit=$?"
```

Actual result:

```text
exit=99
```

Иймээс deliberate threshold failure үед k6 exit code **99** байсан.

---

# 18. Evidence Files

### PASS

```text
results/pass.txt
```

Normal SLO test-ийн бүрэн k6 output.

### CHAOS

```text
results/chaos.txt
```

Server failure/recovery experiment-ийн бүрэн k6 output.

### DELIBERATE FAIL

```text
results/fail.txt
```

Зориудаар threshold зөрчсөн k6 test-ийн бүрэн output.

### k6 Version

```text
results/k6-version.txt
```

Ашигласан k6 version-ийн output.

---

# 19. Git Commit History

Лабораторийн ажлыг үе шаттайгаар meaningful commit-уудаар хадгалсан.

```text
31438b7 Record k6 version
e58b1bf Add deliberate threshold failure test
0eb9029 Add availability chaos test
5770276 Add k6 SLO threshold tests
652e12d Set up Lab 3 local API
```

Ингэснээр 3+ meaningful commit-ийн шаардлагыг хангаж байна.

---

# 20. .gitignore

```text
node_modules/
.DS_Store
```

`node_modules/` repository-д commit хийгдээгүй.

---

# 21. Дүгнэлт

Энэхүү лабораторийн ажлаар Lecture 3-ын Quality Scenario ойлголтыг
ашиглан Performance, Reliability, Availability гэсэн гурван чанарын
scenario-г тодорхойлсон. Scenario бүрийг Overview, System state,
Environment state, External stimulus, Required response, Response
measure гэсэн зургаан хэсгээр тодорхойлж, хэмжигдэх SLI болон SLO болгон
хувиргасан. Дараа нь SLO бүрийг k6 threshold болгон хэрэгжүүлж, normal
load үед бүх үндсэн threshold PASS болсныг `results/pass.txt` файлаар
баталгаажуулсан. PASS test-ийн үед `/cart/add` endpoint-ийн p95 latency
1.61ms, `/report` endpoint-ийн p95 latency 389.16ms, `/pay` error rate
6.01%, checks rate 97.99% байсан. Availability scenario-г шалгахын тулд
API server-ийг зориудаар ойролцоогоор 10 секунд зогсоож, дараа нь дахин
асаасан chaos experiment хийсэн. Chaos test-ийн request-based
availability 76.94% болж, 90%-ийн SLO-г хангаагүй бөгөөд энэ нь failure
stimulus системийн availability-д бодит нөлөө үзүүлснийг харуулсан. Мөн
time-based 12 секундийн error budget болон request-based availability
хоёр өөр хэмжилтийн ойлголт болохыг туршилтын үр дүнгээр тайлбарласан.
Эцэст нь `/report` endpoint-ийн threshold-ийг зориудаар p95\<100ms
болгон өөрчилж FAIL үүсгэн, k6-ийн threshold механизм болон exit code
99-ийг баталгаажуулсан. Ингэснээр Scenario → SLO → Threshold → Test →
Evidence гэсэн бүрэн pipeline-ийг хэрэгжүүлж дуусгасан.

---

# 22. Optional AI Reflection

AI ашиглан Quality Scenario-ийн эхний draft гаргах боломжтой боловч
threshold-ийн утга, stimulus-ийн бодит байдал, system state болон
хэмжүүрийн зөв сонголтыг хүний зүгээс шалгах шаардлагатай. AI нь
системийн бодит behavior-ийг мэдэхгүй үед үндэслэлгүй threshold тоо
санал болгож болох эрсдэлтэй. Энэ лабораторийн ажилд threshold-уудыг
local API-ийн бодит behavior-тэй уялдуулан сонгосон. Жишээлбэл `/report`
endpoint-ийн зориудын 200--400ms delay-ийг харгалзан normal
threshold-ийг p95\<450ms болгосон. Харин deliberate FAIL test-д энэ
threshold-ийг p95\<100ms болгон өөрчилж, бодит k6 output-оор
threshold-ийн үр дүнг шалгасан. Scenario бүрийг Credible, Valuable,
Specific, Precise, Comprehensible гэсэн чанаруудаар шалгах нь threshold
болон requirement-ийн чанарыг сайжруулахад ашигтай. Иймээс AI-г scenario
боловсруулахад туслах хэрэгсэл болгон ашиглаж болох боловч эцсийн SLO
болон threshold сонголтыг бодит системийн behavior болон test evidence
дээр үндэслэх шаардлагатай.
