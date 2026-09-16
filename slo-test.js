import { check, sleep } from "k6";
import http from "k6/http";

export const options = {
  vus: 20,
  duration: "1m",

  // SLO-уудыг k6 threshold болгон шалгаж байна
  thresholds: {
    "http_req_duration{name:cart}": ["p(95)<50"],
    "http_req_failed{name:pay}": ["rate<0.08"],
    checks: ["rate>0.90"],
    "http_req_duration{name:report}": ["p(95)<450"],
  },
};

export default function () {
  const base = "http://localhost:3000";

  // Endpoint бүрт name tag өгч metric-үүдийг тусад нь хэмжинэ
  const c = http.post(`${base}/cart/add`, null, {
    tags: { name: "cart" },
  });

  const r = http.get(`${base}/report`, {
    tags: { name: "report" },
  });

  const p = http.post(`${base}/pay`, null, {
    tags: { name: "pay" },
  });

  // Endpoint бүр HTTP 200 буцаасан эсэхийг шалгана
  check(c, {
    "cart 200": (x) => x.status === 200,
  });

  check(r, {
    "report 200": (x) => x.status === 200,
  });

  check(p, {
    "pay 200": (x) => x.status === 200,
  });

  sleep(1);
}
