<div align="center">

# 💳 EpayDeshi

**bKash · Nagad · Upay · Rocket — ওপেন সোর্স অটো পেমেন্ট গেটওয়ে**

Node.js &nbsp;•&nbsp; Vercel &nbsp;•&nbsp; Firebase Realtime Database

[![Download EpayDeshi App](https://img.shields.io/badge/📲_Download-EpayDeshi_App-0a84ff?style=for-the-badge)](https://apk-cloud.vercel.app/d/epaydeshi)

</div>

---

## 📖 সূচিপত্র

1. [কীভাবে কাজ করে](#-কীভাবে-কাজ-করে)
2. [ধাপ ১: Firebase সেটআপ](#-ধাপ-১-firebase-সেটআপ)
3. [ধাপ ২: কনফিগ ফাইল](#-ধাপ-২-কনফিগ-ফাইল)
4. [ধাপ ৩: Vercel-এ হোস্ট](#-ধাপ-৩-vercel-এ-হোস্ট)
5. [ধাপ ৪: অ্যান্ড্রয়েড অ্যাপ](#-ধাপ-৪-অ্যান্ড্রয়েড-অ্যাপ)
6. [ধাপ ৫: নিজের ওয়েবসাইটে কানেক্ট](#-ধাপ-৫-নিজের-ওয়েবসাইটে-কানেক্ট)
7. [API রেফারেন্স](#-api-রেফারেন্স)
8. [সমস্যা ও সমাধান](#-সমস্যা-ও-সমাধান)

---

## ⚙️ কীভাবে কাজ করে

```
আপনার সাইট ──①──▶ গেটওয়ে API ──▶ payment_url
     ▲                                  │
     │                                  ▼
     │                          কাস্টমার টাকা পাঠায়
     │                          Transaction ID দেয়
     │                                  │
  ④ callback                            ▼
     │            ③ SMS ধরে        ② অ্যাপ Firebase-এ
     └──── গেটওয়ে ◀── Firebase ◀──────  পেমেন্ট সেভ করে
           অটো ভেরিফাই করে
```

1. আপনার সাইট API দিয়ে ইনভয়েস তৈরি করে, `payment_url` পায়
2. কাস্টমার সেই লিংকে গিয়ে টাকা পাঠায় ও Transaction ID দেয়
3. **EpayDeshi অ্যাপ** ([ডাউনলোড](https://apk-cloud.vercel.app/d/epaydeshi)) ফোনে পেমেন্টের SMS পড়ে Firebase-এ সেভ করে
4. সার্ভার Firebase মিলিয়ে ভেরিফাই করে, আপনার সাইটে callback পাঠায়

---

## 🔥 ধাপ ১: Firebase সেটআপ

### ১.১ অ্যাকাউন্ট খুলুন
1. [console.firebase.google.com](https://console.firebase.google.com) এ যান
2. আপনার **Google (Gmail) অ্যাকাউন্ট** দিয়ে লগইন করুন। আলাদা রেজিস্ট্রেশন লাগে না, ফ্রি।

### ১.২ প্রজেক্ট তৈরি
1. **Create a project** (বা **Add project**) চাপুন
2. প্রজেক্টের নাম দিন, যেমন `my-gateway`
3. Google Analytics বন্ধ রাখুন → **Create project** → **Continue**

### ১.৩ Realtime Database তৈরি
1. বাম মেনুতে **Build → Realtime Database** চাপুন
2. **Create Database** চাপুন
3. Location বেছে নিন: **Singapore (asia-southeast1)**, বাংলাদেশের সবচেয়ে কাছে ও ফ্রি প্ল্যানে চলে
4. Security rules এ **Start in test mode** বেছে **Enable** চাপুন

### ১.৪ Rules সেট করুন
1. **Rules** ট্যাবে যান
2. সবকিছু মুছে এটা বসিয়ে **Publish** চাপুন:

```json
{
  "rules": {
    "transactions": { ".read": true, ".write": true },
    "invoices":     { ".read": true, ".write": true },
    "pay_tokens":   { ".read": true, ".write": true },
    "claims":       { ".read": true, ".write": true }
  }
}
```

গেটওয়ে ও অ্যাপ শুধু এই ৪টা path ব্যবহার করে, বাকি সব বন্ধ থাকে।

> ⚠️ Database URL গোপন রাখুন। এটা যার কাছে থাকবে সে এই ৪টা path এর ডেটা পড়তে ও লিখতে পারবে। Test mode ৩০ দিন পর বন্ধ হয়ে যায়, তাই উপরের Rules অবশ্যই Publish করুন।

### ১.৫ Database URL কপি করুন
**Data** ট্যাবের একদম উপরে লিংকটা দেখবেন, এটাই আপনার `databaseURL`:

```
https://my-gateway-default-rtdb.asia-southeast1.firebasedatabase.app
```

### ১.৬ Firebase কনফিগ কপি করুন
1. বাম উপরে ⚙️ **Project settings** → **General**
2. নিচে **Your apps** এ `</>` (Web) আইকন চাপুন
3. অ্যাপের একটা নাম দিন → **Register app**
4. যে `firebaseConfig` দেখাবে সেটা কপি করে রাখুন:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "my-gateway.firebaseapp.com",
  projectId: "my-gateway",
  storageBucket: "my-gateway.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## 🛠️ ধাপ ২: কনফিগ ফাইল

শুধু `config/` ফোল্ডারের ফাইল এডিট করবেন, আর কিছু ছুঁতে হবে না।

### `config/firebase.js`
ধাপ ১.৫ ও ১.৬ এর মান বসান:

```js
module.exports = {
  databaseURL: "https://my-gateway-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "my-gateway",
  apiKey: "AIzaSy...",
  authDomain: "my-gateway.firebaseapp.com",
  storageBucket: "my-gateway.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  authToken: ""
};
```

### `config/payment.js`
যে মেথড চালাবেন তার রিসিভার নম্বর দিন। `01XXXXXXXXX` রেখে দিলে সেই মেথড পেমেন্ট পেজে দেখাবে না।

```js
module.exports = {
  bkash:  { receiverNumber: "01712345678" },
  nagad:  { receiverNumber: "01712345678" },
  upay:   { receiverNumber: "01XXXXXXXXX" },
  rocket: { receiverNumber: "01XXXXXXXXX" }
};
```

### `config/secrets.js`
দুটোই নিজের মতো লম্বা random লেখা দিন। ডিফল্ট `CHANGE_ME` রাখলে API চালু হবে না।

```js
module.exports = {
  apiKey: "k9Xs2LmQ7vPz4TnB8wRc",
  callbackSecret: "a1B2c3D4e5F6g7H8i9J0kLmNoPqRsTuV"
};
```

### `config/app.js`
```js
module.exports = {
  siteName: "My Pay",
  logoUrl: "https://example.com/logo.png",
  pageBaseUrl: "https://my-gateway.vercel.app",

  supportName: "My Support",
  supportWhatsapp: "8801712345678",
  supportTelegram: "myusername",
  supportEmail: "support@example.com",

  invoiceTtlMinutes: 15,
  verifyWindowMs: 15000,
  verifyPollMs: 3000,
  maxVerifyAttempts: 3,
  defaultWebsiteUrl: ""
};
```

`pageBaseUrl` পরের ধাপে Vercel লিংক পাওয়ার পর বদলাবেন।

---

## 🚀 ধাপ ৩: Vercel-এ হোস্ট

### ৩.১ GitHub-এ আপলোড
1. [github.com](https://github.com) এ অ্যাকাউন্ট খুলুন
2. **New repository** → নাম দিন → **Private** বেছে **Create**
3. **uploading an existing file** চাপুন, প্রজেক্টের সব ফাইল ও ফোল্ডার ড্র্যাগ করে **Commit changes**

### ৩.২ Vercel-এ ডিপ্লয়
1. [vercel.com](https://vercel.com) এ **Continue with GitHub** দিয়ে সাইন আপ করুন
2. **Add New → Project** → আপনার repo এর পাশে **Import**
3. কোনো সেটিং না বদলে **Deploy** চাপুন
4. ১-২ মিনিটে লিংক পাবেন, যেমন `https://my-gateway.vercel.app`

### ৩.৩ লিংক বসান
1. `config/app.js` এ `pageBaseUrl` এ এই লিংক বসান (GitHub-এ ফাইলে ✏️ চেপে এডিট করে Commit করলেই অটো রিডিপ্লয় হবে)
2. ব্রাউজারে খুলে দেখুন কাজ করছে কিনা:

```
https://my-gateway.vercel.app/api/health
```

```json
{
  "success": true,
  "status": "ok",
  "service": "EpayDeshi API",
  "timestamp": "2026-10-08T12:00:00+06:00"
}
```

---

## 📱 ধাপ ৪: অ্যান্ড্রয়েড অ্যাপ

ফোনে আসা bKash / Nagad / Upay / Rocket এর SMS পড়ে Firebase-এ পাঠানোর কাজটা করে **EpayDeshi** অ্যাপ। যে ফোনে পেমেন্ট রিসিভ করেন (ধাপ ২ এ দেওয়া নম্বরের সিম) সেই ফোনে এটা ইনস্টল করুন।

<div align="center">

### 📲 [EpayDeshi অ্যাপ ডাউনলোড করুন](https://apk-cloud.vercel.app/d/epaydeshi)

`https://apk-cloud.vercel.app/d/epaydeshi`

</div>

### ৪.১ ইনস্টল
1. উপরের লিংক থেকে APK ডাউনলোড করুন
2. ইনস্টলের সময় **Install unknown apps** এর অনুমতি চাইলে দিন
3. অ্যাপ খুলুন

### ৪.২ Firebase কানেক্ট
অ্যাপে **Settings → Firebase Configuration** এ ধাপ ১ এর মান বসান:

| অ্যাপের ঘর | কোথা থেকে |
|---|---|
| Database URL | `databaseURL` |
| Project ID | `projectId` |
| API Key / Auth Token | `apiKey` |
| Auth Domain | `authDomain` |
| Storage Bucket | `storageBucket` |
| Messaging Sender ID | `messagingSenderId` |
| App ID | `appId` |

তারপর **Test Connection** চেপে ঠিক থাকলে **Save Config**।

### ৪.৩ অনুমতি
**Permissions** এ **SMS পড়ার অনুমতি** দিন। ব্যাটারি অপটিমাইজেশন থেকে অ্যাপটা বাদ দিন, না হলে ব্যাকগ্রাউন্ডে SMS ধরা বন্ধ হয়ে যেতে পারে।

### ৪.৪ অ্যাপ যেভাবে ডেটা সেভ করে
প্রতিটি মেথডের জন্য আলাদা ফোল্ডার। একই Transaction ID এক মেথডে ব্যবহার হলে অন্য মেথডে প্রভাব পড়ে না।

```
transactions /
  bkash  / <TransactionID> / { transactionId, amount, senderNumber, status, receivedAt }
  nagad  / <TransactionID> / { ... }
  upay   / <TransactionID> / { ... }
  rocket / <TransactionID> / { ... }
```

| ফিল্ড | বিবরণ |
|---|---|
| `transactionId` | SMS এর Transaction ID |
| `amount` | টাকার পরিমাণ (সংখ্যা) |
| `senderNumber` | যে নম্বর থেকে টাকা এসেছে |
| `status` | পেমেন্টের অবস্থা |
| `receivedAt` | SMS আসার সময়, epoch milliseconds |

> পুরনো পদ্ধতি `transactions/<TransactionID>` (ফ্ল্যাট) এখনো চলে, তবে সেখানে `provider` ফিল্ড থাকতে হবে। নতুন ইনস্টলে উপরের ফোল্ডার পদ্ধতিই ব্যবহার করুন।

আপনার অ্যাপের ফিল্ডের নাম আলাদা হলে `config/sms.js` এ মিলিয়ে নিন।

---|---|
| Database URL | `databaseURL` |
| Project ID | `projectId` |
| API Key / Auth Token | `apiKey` |
| Auth Domain | `authDomain` |
| Storage Bucket | `storageBucket` |
| Messaging Sender ID | `messagingSenderId` |
| App ID | `appId` |

তারপর **Test Connection** চেপে ঠিক থাকলে **Save Config**। **Permissions** এ SMS পড়ার অনুমতি দিন।

অ্যাপ প্রতিটি পেমেন্ট এভাবে সেভ করে:

```
transactions / <TransactionID> / { amount, sender_number ... }
```

আপনার অ্যাপের ফিল্ডের নাম আলাদা হলে `config/sms.js` এ মিলিয়ে নিন।

---

## 🔌 ধাপ ৫: নিজের ওয়েবসাইটে কানেক্ট

> 🔒 `apiKey` শুধু **সার্ভার সাইডে** ব্যবহার করবেন। ব্রাউজার বা JavaScript ফ্রন্টএন্ডে কখনো রাখবেন না।

**ফ্লো:** ইনভয়েস তৈরি → কাস্টমারকে `payment_url` এ পাঠান → callback এলে অর্ডার কমপ্লিট করুন।

### ৫.১ ইনভয়েস তৈরি

<details open>
<summary><b>Node.js</b></summary>

```js
const res = await fetch("https://my-gateway.vercel.app/v1/payment/create", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.GATEWAY_API_KEY
  },
  body: JSON.stringify({
    amount: 100,
    customer_id: "user_1",
    callback_url: "https://mysite.com/payment/callback",
    success_url: "https://mysite.com/payment/success",
    cancel_url: "https://mysite.com/payment/cancel"
  })
});
const data = await res.json();
// data.payment_url এ কাস্টমারকে redirect করুন
```
</details>

<details>
<summary><b>PHP</b></summary>

```php
$ch = curl_init("https://my-gateway.vercel.app/v1/payment/create");
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    "Content-Type: application/json",
    "x-api-key: YOUR_API_KEY"
  ],
  CURLOPT_POSTFIELDS => json_encode([
    "amount" => 100,
    "customer_id" => "user_1",
    "callback_url" => "https://mysite.com/payment/callback",
    "success_url" => "https://mysite.com/payment/success",
    "cancel_url" => "https://mysite.com/payment/cancel"
  ])
]);
$data = json_decode(curl_exec($ch), true);
header("Location: " . $data["payment_url"]);
```
</details>

<details>
<summary><b>cURL</b></summary>

```bash
curl -X POST https://my-gateway.vercel.app/v1/payment/create \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount":100,"customer_id":"user_1","callback_url":"https://mysite.com/payment/callback"}'
```
</details>

**সফল রেসপন্স** `201`:

```json
{
  "success": true,
  "invoice_id": "INV-20261008-48213",
  "amount": 100,
  "payment_url": "https://my-gateway.vercel.app/pay/k7x2m9qa"
}
```

### ৫.২ Callback নেওয়া

পেমেন্ট সফল, ব্যর্থ বা বাতিল হলে গেটওয়ে আপনার `callback_url` এ `POST` করে। সফল হলে এমন আসবে:

```json
{
  "event": "payment.completed",
  "invoice_id": "INV-20261008-48213",
  "status": "completed",
  "amount": 100,
  "currency": "BDT",
  "customer_id": "user_1",
  "payment_method": "bkash",
  "transaction_id": "DJ67I799J5",
  "sender_number": "01712345678",
  "verified_at": "2026-10-08T12:05:30+06:00",
  "created_at": "2026-10-08T12:03:10+06:00",
  "timestamp": "2026-10-08T12:05:31+06:00"
}
```

`event` এর মান: `payment.completed`, `payment.failed`, `payment.cancelled`।

**Signature যাচাই করুন** (জাল callback ঠেকাতে অবশ্যই):
হেডার `x-epaydeshi-signature: sha256=...` এ পুরো body র HMAC-SHA256 থাকে, চাবি হলো আপনার `callbackSecret`।

<details open>
<summary><b>Node.js (Express)</b></summary>

```js
const crypto = require("crypto");

app.post("/payment/callback", express.raw({ type: "application/json" }), (req, res) => {
  const expected = "sha256=" + crypto
    .createHmac("sha256", process.env.CALLBACK_SECRET)
    .update(req.body)
    .digest("hex");
  const got = req.headers["x-epaydeshi-signature"] || "";

  if (got.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
    return res.sendStatus(401);
  }

  const data = JSON.parse(req.body);
  if (data.event === "payment.completed") {
    // data.invoice_id দিয়ে অর্ডার পেইড করুন
  }
  res.sendStatus(200);
});
```
</details>

<details>
<summary><b>PHP</b></summary>

```php
$raw = file_get_contents("php://input");
$expected = "sha256=" . hash_hmac("sha256", $raw, "YOUR_CALLBACK_SECRET");
$got = $_SERVER["HTTP_X_EPAYDESHI_SIGNATURE"] ?? "";

if (!hash_equals($expected, $got)) { http_response_code(401); exit; }

$data = json_decode($raw, true);
if ($data["event"] === "payment.completed") {
  // $data["invoice_id"] দিয়ে অর্ডার পেইড করুন
}
http_response_code(200);
```
</details>

> ✅ সঠিক পদ্ধতি: callback বা status API দিয়ে নিশ্চিত হয়ে তারপর অর্ডার পেইড করবেন। শুধু `success_url` এ কাস্টমার এসেছে বলে পেইড ধরবেন না।

---

## 📚 API রেফারেন্স

সব রিকোয়েস্টে হেডার: `x-api-key: YOUR_API_KEY`

| Method | Endpoint | কাজ |
|---|---|---|
| `POST` | `/v1/payment/create` | ইনভয়েস তৈরি |
| `GET` | `/v1/payment/status/{invoice_id}` | স্ট্যাটাস দেখা |
| `POST` | `/v1/payment/cancel` | ইনভয়েস বাতিল |
| `GET` | `/api/health` | সার্ভার ঠিক আছে কিনা (key লাগে না) |

### Create এর ফিল্ড

| ফিল্ড | ধরন | বাধ্যতামূলক | বিবরণ |
|---|---|---|---|
| `amount` | number | ✅ | সর্বোচ্চ ৫,০০,০০০, দশমিকের পর ২ ঘর |
| `customer_id` | string | ❌ | আপনার ইউজার আইডি (সর্বোচ্চ ৬৪ অক্ষর) |
| `payment_method` | string | ❌ | `bkash` `nagad` `upay` `rocket`, না দিলে কাস্টমার বেছে নেবে |
| `callback_url` | string | ❌ | https হতে হবে |
| `success_url` | string | ❌ | সফল হলে কাস্টমার যেখানে ফিরবে |
| `cancel_url` | string | ❌ | বাতিল করলে যেখানে ফিরবে |
| `website_url` | string | ❌ | Home বাটনের লিংক |

### Status

```
GET /v1/payment/status/INV-20261008-48213
```

```json
{
  "success": true,
  "status": "completed",
  "data": {
    "invoice_id": "INV-20261008-48213",
    "amount": 100,
    "payment_method": "bkash",
    "transaction_id": "DJ67I799J5",
    "created_at": "2026-10-08T12:03:10+06:00",
    "expires_at": "2026-10-08T12:18:10+06:00",
    "verified_at": "2026-10-08T12:05:30+06:00"
  }
}
```

### Cancel

```json
{ "invoice_id": "INV-20261008-48213" }
```

### Status এর মান

| মান | মানে |
|---|---|
| `pending` | কাস্টমারের পেমেন্টের অপেক্ষায় |
| `processing` | ভেরিফাই চলছে |
| `completed` | ✅ পেমেন্ট সফল |
| `failed` | মিলেনি, কাস্টমার আবার চেষ্টা করতে পারে |
| `expired` | সময় শেষ |
| `cancelled` | বাতিল |

### Error রেসপন্স

সব error এই আকারে আসে:

```json
{
  "success": false,
  "status": "error",
  "message": "Invalid amount",
  "error": {
    "code": "INVALID_AMOUNT",
    "details": "amount must be greater than 0"
  }
}
```

| HTTP | `code` | কারণ |
|---|---|---|
| 400 | `INVALID_AMOUNT` | amount ভুল |
| 400 | `INVALID_PAYMENT_METHOD` | মেথড ভুল বা নম্বর সেট করা নেই |
| 400 | `INVALID_REQUEST` | অন্য ফিল্ড ভুল |
| 401 | `UNAUTHORIZED` | `x-api-key` ভুল বা নেই |
| 404 | `NOT_FOUND` | ইনভয়েস নেই |
| 409 | `PAYMENT_ALREADY_COMPLETED` | আগেই পেইড |
| 410 | `PAYMENT_EXPIRED` | সময় শেষ |
| 500 | `NOT_CONFIGURED` | `config/secrets.js` এ `apiKey` বদলানো হয়নি |

---

## 🧰 সমস্যা ও সমাধান

| সমস্যা | সমাধান |
|---|---|
| `NOT_CONFIGURED` | `config/secrets.js` এ `apiKey` নিজের মতো দিন, তারপর রিডিপ্লয় |
| `UNAUTHORIZED` | `x-api-key` হেডারের মান `apiKey` এর সাথে মেলান |
| `Payment method is currently unavailable` | `config/payment.js` এ ওই মেথডের আসল নম্বর দিন |
| `Realtime Database 401/403` | Firebase Rules এ `transactions`, `invoices`, `pay_tokens`, `claims` চারটারই `.read` ও `.write` `true` আছে কিনা দেখুন |
| `Realtime Database 404` বা কানেক্ট হয় না | `databaseURL` ঠিক আছে কিনা দেখুন, শেষে `/` দেবেন না |
| `No matching transaction found` | অ্যাপ SMS ধরে Firebase-এ `transactions/<method>/<TrxID>` এ (যেমন `transactions/bkash/DJ67I799J5`) সেভ করেছে কিনা Data ট্যাবে দেখুন |
| `Transaction details did not match` | amount বা sender নম্বর মেলেনি |
| SMS আসে কিন্তু Firebase-এ সেভ হয় না | অ্যাপে SMS পারমিশন ও Firebase কনফিগ ঠিক আছে কিনা দেখুন, ব্যাটারি অপটিমাইজেশন বন্ধ করুন |
| Transaction ID এক মেথডে ব্যবহারের পর অন্য মেথডে "মেলেনি" আসছে | স্বাভাবিক, প্রতিটি মেথডের ডেটা আলাদা ফোল্ডারে থাকে |
| callback আসে না | `callback_url` https কিনা দেখুন, localhost চলবে না |
| কনফিগ বদলেও কাজ করে না | GitHub-এ Commit করেছেন কিনা ও Vercel এ নতুন Deployment হয়েছে কিনা দেখুন |

---

## 📄 লাইসেন্স

[MIT License](LICENSE). ফ্রিতে ব্যবহার, পরিবর্তন ও শেয়ার করতে পারবেন।

<div align="center">

📲 [EpayDeshi অ্যাপ ডাউনলোড](https://apk-cloud.vercel.app/d/epaydeshi) &nbsp;•&nbsp; ⭐ কাজে লাগলে repo তে Star দিন

</div>
