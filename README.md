# Lab 03 — Quality Scenarios → SLO → k6 Threshold

**Оюутан:** О.Мэнд-Амар  
**Оюутны код:** B232270001  
**Хичээл:** Программ хангамжийн чанарын баталгаа ба туршилт

---

## 1. Лабораторийн зорилго

Энэ лабораторийн ажлаар Lecture 3-т үзсэн **Quality Scenario** ойлголтыг өөрийн локал API дээр туршиж үзсэн. Эхлээд Performance, Reliability, Availability гэсэн гурван чанарын scenario-г тодорхойлж, дараа нь тэдгээрийг SLO болгон хувиргасан. Эцэст нь SLO бүрийг k6 threshold-ээр шалгаж, хэвийн ажиллагааны үр дүн, server тасалсан chaos test, мөн зориудаар FAIL болгосон test-ийн output-уудыг хадгалсан.

Хэрэгжүүлсэн pipeline:

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

Version-ийн бүрэн output: [`results/k6-version.txt`](results/k6-version.txt)

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

Файлууд руу шууд орох холбоосууд:

- [`server.js`](server.js) — локал Express API
- [`slo-test.js`](slo-test.js) — үндсэн SLO threshold test
- [`slo-test-fail.js`](slo-test-fail.js) — зориудаар FAIL үүсгэсэн test
- [`results/`](results/) — бүх test-ийн output
- [`.gitignore`](.gitignore) — repository-д оруулахгүй файлуудын тохиргоо
- [`package.json`](package.json) — Node.js project configuration

`node_modules/` болон `.DS_Store` нь `.gitignore`-д орсон.

---

# 4. Local API

Лабораторийн туршилтад Node.js + Express дээр ажиллах энгийн локал API ашигласан. API-ийн бүрэн кодыг [`server.js`](server.js) файлаас харж болно.

| Method | Endpoint    | Үүрэг               |
| ------ | ----------- | ------------------- |
| POST   | `/cart/add` | Cart-д item нэмэх   |
| GET    | `/report`   | Report боловсруулах |
| POST   | `/pay`      | Payment хийх        |

### `/cart/add`

Энэ endpoint нэмэлт delay эсвэл зориудаар үүсгэсэн failure-гүй, энгийн `200 OK` response буцаана.

```json
{
  "ok": true,
  "items": 1
}
```

### `/report`

Энэ endpoint дээр response latency-г туршихын тулд зориудаар 200–400ms орчим delay өгсөн.

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

Payment endpoint дээр failure rate-ийг туршихын тулд ойролцоогоор 5%-ийн failure probability зориудаар оруулсан.

```javascript
if (Math.random() < 0.05)
  return res.status(500).json({ error: "gateway timeout" });
```

Ингэснээр Reliability scenario дээр бодит failure-ийг хэмжих боломжтой болсон.

---

# 5. Quality Scenarios

Scenario бүрийг Lecture 3-ын дараах 6 хэсгээр тодорхойлсон:

1. Overview
2. System state
3. Environment state
4. External stimulus
5. Required response
6. Response measure

## 5.1 Performance Scenario — `/cart/add`

| Scenario хэсэг        | Тодорхойлолт                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| **Overview**          | Cart-д item нэмэх үйлдэл хэвийн ачааллын үед хурдан response өгөх ёстой.                                |
| **System state**      | Local API ажиллаж байгаа бөгөөд `/cart/add` endpoint request хүлээн авахад бэлэн байна.                 |
| **Environment state** | macOS дээр Node.js + Express API ажиллаж байна. k6 нь 20 VUs ашиглана.                                  |
| **External stimulus** | 20 concurrent VUs хэвийн ачааллын үед `POST /cart/add` request илгээнэ. Test window нь 1 минут.         |
| **Required response** | Request бүр HTTP 200 response буцаах ёстой.                                                             |
| **Response measure**  | `/cart/add` response latency-ийн p95 нь 50ms-ээс бага байна. Мөн `cart 200` check-ээр амжилтыг шалгана. |

### Performance SLO

```text
SLI: http_req_duration{name:cart}
SLO: p95 < 50ms
Load: 20 VUs
Window: 1 minute
```

---

## 5.2 Reliability Scenario — `/pay`

| Scenario хэсэг        | Тодорхойлолт                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| **Overview**          | Payment үйлдлийг хэвийн ажиллагааны үед тогтвортой боловсруулж, failure-ийн давтамжийг хязгаарлах ёстой. |
| **System state**      | Local API ажиллаж байгаа бөгөөд `/pay` endpoint request хүлээн авахад бэлэн байна.                       |
| **Environment state** | macOS дээр Node.js + Express API ажиллаж байна. k6 нь 20 VUs ашиглана.                                   |
| **External stimulus** | 20 VUs 1 минутын турш хэвийн payment request илгээнэ.                                                    |
| **Required response** | Payment request-үүдийн failure rate зөвшөөрөгдөх хязгаараас бага байна.                                  |
| **Response measure**  | `/pay` endpoint-ийн HTTP request failure rate 8%-аас бага байна.                                         |

### Reliability SLO

```text
SLI: http_req_failed{name:pay}
SLO: error rate < 8%
Load: 20 VUs
Window: 1 minute
```

`/pay` endpoint өөрөө ойролцоогоор 5%-ийн failure probability-тэй тул 8%-ийг хүлээн зөвшөөрөх дээд хязгаар болгон сонгосон.

---

## 5.3 Availability Scenario — API Server Failure

| Scenario хэсэг        | Тодорхойлолт                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Overview**          | Server failure гарсан үед системийн availability болон recovery behavior-ийг шалгана.                                                                        |
| **System state**      | Local API хэвийн ажиллаж, k6-ээс ирэх request-үүдийг боловсруулж байна.                                                                                      |
| **Environment state** | macOS localhost орчинд Node.js + Express server ажиллаж байна. k6 нь 20 VUs-тай 2 минут ажиллана.                                                            |
| **External stimulus** | API server-ийг зориудаар зогсоож, ойролцоогоор 10 секундын дараа дахин асаана.                                                                               |
| **Required response** | Failure үед request failures ажиглагдаж, server restart хийсний дараа систем дахин request боловсруулах боломжтой болно.                                     |
| **Response measure**  | Availability percentage болон request/check-based availability-г хэмжиж, server restart-ийн дараах recovery behavior-ийг ажиглана. Availability SLO нь ≥90%. |

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

Үндсэн threshold-уудыг [`slo-test.js`](slo-test.js) дотор мөн адил утгаар хэрэгжүүлсэн.

| Quality                          | SLI                            | SLO         | k6 Threshold | Window / Load  |
| -------------------------------- | ------------------------------ | ----------- | ------------ | -------------- |
| Performance `/cart/add`          | p95 latency                    | p95 < 50ms  | `p(95)<50`   | 20 VUs / 1 min |
| Reliability `/pay`               | error rate                     | < 8%        | `rate<0.08`  | 20 VUs / 1 min |
| Availability                     | successful checks/request rate | ≥ 90%       | `rate>0.90`  | 20 VUs / 2 min |
| Supporting Performance `/report` | p95 latency                    | p95 < 450ms | `p(95)<450`  | 20 VUs / 1 min |

README-д тодорхойлсон үндсэн threshold болон [`slo-test.js`](slo-test.js) доторх threshold-ууд ижил.

---

# 7. Threshold сонгосон үндэслэл

### `/cart/add` — p95 < 50ms

`/cart/add` нь localhost дээр нэмэлт delay-гүй энгийн endpoint учраас 50ms-ийн p95 threshold ашигласан. Энэ босго нь зориудаар хэт сул биш, мөн local орчны жижиг хэлбэлзлийг тооцох боломжтой байхаар сонгосон.

PASS test-ийн actual result:

```text
p(95) = 1.61ms
```

### `/pay` — error rate < 8%

`/pay` endpoint нь өөрөө ойролцоогоор 5%-ийн failure probability үүсгэдэг. Тиймээс бага хэмжээний random хэлбэлзлийг зөвшөөрөхийн тулд 8%-ийн error-rate threshold сонгосон.

PASS test-ийн actual result:

```text
error rate = 6.01%
```

### Availability — ≥ 90%

Availability scenario-д 90%-ийн SLO ашигласан.

```text
2 minutes = 120 seconds
100% - 90% = 10%

120 × 0.10 = 12 seconds
```

Иймээс 2 минутын window-ийн **time-based error budget = 12 seconds**.

### `/report` — p95 < 450ms

`/report` endpoint дээр 200–400ms орчим зориудаар delay өгсөн. Туршилтаар хэмжихэд энэ endpoint-ийн p95 нь 389.16ms байсан тул 450ms-ийн threshold сонгосон.

---

# 8. k6 Threshold Implementation

Үндсэн test-ийн кодыг [`slo-test.js`](slo-test.js) файлаас бүтнээр харж болно.

Threshold хэсэг:

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

Endpoint бүрийг тусгай `name` tag ашиглан ялгасан:

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

Ингэснээр `/cart/add`, `/report`, `/pay` endpoint-үүдийн metric-ийг тусад нь threshold-ээр шалгах боломжтой болсон.

---

# 9. PASS Test

Ашигласан команд:

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

| Metric         |   Actual | Threshold | Result   |
| -------------- | -------: | --------: | -------- |
| Checks         |   97.99% |     > 90% | **PASS** |
| Cart p95       |   1.61ms |    < 50ms | **PASS** |
| Report p95     | 389.16ms |   < 450ms | **PASS** |
| Pay error rate |    6.01% |      < 8% | **PASS** |

Additional results:

```text
Iterations: 931
HTTP requests: 2793
Failed HTTP requests: 56
```

**Бүрэн output:** [`results/pass.txt`](results/pass.txt)

---

# 10. Chaos Experiment

Availability scenario-г шалгахын тулд 2 минутын k6 test ажиллаж байх үед API server-ийг зориудаар зогсоосон.

### Experiment

1. API server-ийг ажиллуулсан.
2. k6 test-ийг 20 VUs, 2 минутын тохиргоотой эхлүүлсэн.
3. Test ажиллаж байх үед server-ийг `Ctrl+C` ашиглан зогсоосон.
4. Server-ийг ойролцоогоор 10 секунд унтраалттай байлгасан.
5. Server-ийг дахин асаасан.
6. k6 test 2 минут дуустал үргэлжилсэн.

Энэ туршилтын зорилго нь server failure гарсан үед request-үүд хэрхэн өөрчлөгдөж байгааг болон restart-ийн дараа request боловсруулах ажиллагаа сэргэж байгаа эсэхийг харах байсан.

---

# 11. Chaos Test Results

**Бүрэн output:** [`results/chaos.txt`](results/chaos.txt)

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

Chaos test-ийн үед availability check rate 76.94% болж, 90%-ийн threshold-ээс доош орсон. Мөн server бүхэлдээ унтарсан хугацаанд `/pay` request-үүд ч failed болсон тул `/pay` error rate 26.10% болж өссөн.

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

Мөн k6-ийн `checks` статистикт:

```text
checks_total = 5826
checks_succeeded = 4483
checks_failed = 1343
```

гэж гарсан бөгөөд энэ нь дээрх request-based availability тооцоотой таарч байна.

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

Chaos experiment-д server ойролцоогоор 10 секунд зогссон. Гэхдээ энд хоёр өөр хэмжүүрийг ялгах хэрэгтэй.

Time-based error budget нь:

```text
outage time
```

дээр үндэслэнэ.

Харин энэ лабораторид k6-ээр тооцсон request-based availability нь:

```text
successful requests / total requests
```

дээр үндэслэсэн.

Server унтарсан үед connection failure хурдан буцаж болох тул тухайн 10 секундийн outage-ийн хугацаанд олон failed request үүсэх боломжтой. Тиймээс **12 секундийн time-based error budget** болон **76.94%-ийн request-based availability** нь шууд нэг тоо болгон харьцуулах хоёр ижил хэмжүүр биш.

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

тул reliability threshold PASS болсон.

Chaos test-ийн үед server бүхэлдээ унтарсан тул `/pay` request-үүд мөн failed болсон:

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

Эндээс хоёр хэмжүүрийн зорилго ялгаатай харагдаж байна. **Reliability** scenario дээр хэвийн ажиллагааны үед payment request хэр олон удаа failure болж байгааг шалгасан. Харин **Availability** scenario дээр server failure гэсэн external stimulus өгөөд, систем request боловсруулах боломжоо хэр хадгалж байгаа болон restart-ийн дараа буцаж ажиллаж байгаа эсэхийг ажигласан.

---

# 15. Deliberate FAIL Test

Threshold механизм зөв ажиллаж байгааг шалгахын тулд зориудаар FAIL үүсгэсэн.

[`slo-test-fail.js`](slo-test-fail.js) нь үндсэн [`slo-test.js`](slo-test.js)-тэй ижил test бөгөөд `/report` threshold-ийг:

```text
p(95)<450
```

байсныг:

```text
p(95)<100
```

болгон өөрчилсөн.

`/report` endpoint өөрөө 200–400ms орчим delay үүсгэдэг тул 100ms-ийн threshold-ийг зориудаар хангах боломжгүй нөхцөл болгосон.

---

# 16. Deliberate FAIL Results

Ашигласан команд:

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

| Metric         |   Actual | Threshold | Result   |
| -------------- | -------: | --------: | -------- |
| Report p95     | 391.74ms |   < 100ms | **FAIL** |
| Checks         |   98.31% |     > 90% | **PASS** |
| Cart p95       |   1.63ms |    < 50ms | **PASS** |
| Pay error rate |    5.05% |      < 8% | **PASS** |

k6 threshold failure message:

```text
thresholds on metrics 'http_req_duration{name:report}' have been crossed
```

**Бүрэн output:** [`results/fail.txt`](results/fail.txt)

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

Ингэснээр threshold зөрчигдсөн үед k6 зөвхөн terminal дээр FAIL гэж харуулах биш, process-ийн exit code-оор мөн failure-г буцааж байгааг шалгасан.

---

# 18. Evidence Files

Туршилтын output-уудыг `results/` folder дотор тусад нь хадгалсан.

- **PASS:** [`results/pass.txt`](results/pass.txt) — хэвийн ажиллагааны бүрэн k6 output
- **CHAOS:** [`results/chaos.txt`](results/chaos.txt) — server failure/recovery experiment-ийн бүрэн output
- **DELIBERATE FAIL:** [`results/fail.txt`](results/fail.txt) — зориудаар threshold зөрчсөн test-ийн бүрэн output
- **k6 Version:** [`results/k6-version.txt`](results/k6-version.txt) — ашигласан k6 version-ийн output

Folder руу шууд орох: [`results/`](results/)

---

# 19. Git Commit History

Лабораторийн ажлыг нэг дор биш, үе шаттайгаар meaningful commit-уудаар хадгалсан.

```text
8062a0f Complete Lab 3 documentation
31438b7 Record k6 version
e58b1bf Add deliberate threshold failure test
0eb9029 Add availability chaos test
5770276 Add k6 SLO threshold tests
652e12d Set up Lab 3 local API
```

GitHub дээрх commit history: [`Commits`](https://github.com/mendamar0517/lab03-quality-scenarios-k6/commits/main)

Нийт 6 meaningful commit байгаа тул 3+ commit-ийн шаардлагыг хангаж байна.

---

# 20. .gitignore

[` .gitignore`](.gitignore) файлд:

```text
node_modules/
.DS_Store
```

гэж тохируулсан.

`node_modules/` repository-д commit хийгдээгүй.

---

# 21. Дүгнэлт

Энэ лабораторийн ажлаар Lecture 3-ын Quality Scenario ойлголтыг ашиглаад өөрийн локал API дээр Performance, Reliability, Availability гэсэн гурван scenario-г тодорхойлсон. Scenario бүрийг Overview, System state, Environment state, External stimulus, Required response, Response measure гэсэн зургаан хэсгээр тодорхойлж, дараа нь SLI болон SLO болгон хувиргасан. Хамгийн их анхаарах шаардлагатай хэсэг нь scenario дээр бичсэн шаардлагыг k6 дээр яг хэмжигдэхүйц threshold болгох байсан. Normal load test-ийн үед `/cart/add`, `/report`, `/pay` болон availability check-ийн threshold-ууд бүгд PASS болсон. Жишээлбэл `/cart/add` p95 нь 1.61ms, `/report` p95 нь 389.16ms, `/pay` error rate нь 6.01% гарсан. Дараа нь server-ийг ойролцоогоор 10 секунд зориудаар зогсоож chaos experiment хийхэд request-based availability 76.94% болж, 90%-ийн SLO-д хүрээгүй. Энэ туршилтаас time-based 12 секундын error budget болон request-based availability нь өөр өөр хэмжүүр гэдгийг бодитоор харж болохоор байсан. Мөн server унтарсан үед `/pay` error rate өссөн нь reliability болон availability-ийн хэмжүүрүүд failure-ийн үед хоорондоо давхардаж болох ч анх тавьсан зорилго нь өөр байдгийг харуулсан. Эцэст нь `/report` threshold-ийг p95<100ms болгон зориудаар хатууруулж FAIL test ажиллуулахад 391.74ms гарч, k6 exit code 99 буцсан. Ингэснээр Scenario → SLO → Threshold → Test → Evidence гэсэн pipeline-ийг өөрийн туршилтын output-оор бүрэн шалгасан.

---

# 22. Optional AI Reflection

AI ашиглан Quality Scenario-ийн эхний санаа эсвэл draft гаргаж болох боловч гарсан утгуудыг шууд ашиглахгүйгээр тухайн API-ийн бодит behavior-тэй тулгаж үзэх шаардлагатай. Энэ лабораторийн хувьд threshold сонгохдоо endpoint бүрийн ажиллах байдлыг харгалзсан. Жишээлбэл `/report` endpoint дээр 200–400ms delay байгаа тул normal threshold-ийг p95<450ms болгож, бодит test-ийн үр дүнгээр 389.16ms гарсныг шалгасан. Харин deliberate FAIL test дээр ижил endpoint-ийн threshold-ийг p95<100ms болгож өөрчилснөөр threshold үнэхээр зөрчигдөж байгаа эсэхийг шалгасан. Мөн Availability scenario дээр server-ийг зориудаар унтрааж үзсэн нь зөвхөн онолын requirement биш, бодит test-ээр шалгах боломжтой stimulus болгосон. Scenario бүрийг Credible, Valuable, Specific, Precise, Comprehensible гэсэн чанаруудаар нягталж үзэх нь шаардлага хэт ерөнхий эсвэл хэмжих боломжгүй болохоос сэргийлнэ. Миний хувьд AI-г эхний санаа боловсруулахад ашиглаж болох ч эцсийн scenario, SLO болон threshold-ийг test-ийн бодит output-той тулгаж байж шийдэх нь илүү зөв гэж үзсэн.
