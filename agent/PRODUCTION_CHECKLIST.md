# ExzaEstate — Production Launch Execution Checklist (v1.0)

> **নিয়ম ও কর্মপদ্ধতি (Execution Discipline):**
> ১. নিচে দেওয়া তালিকা থেকে ক্রমানুসারে **একটি করে টাস্কের প্রম্পট (Prompt to Copy)** কপি করে চ্যাটে দিন।
> ২. আমি ওই টাস্কটির কাজ শতভাগ শেষ করে টেস্ট ও ভেরিফাই করব।
> ৩. কাজ সফলভাবে শেষ হলে এই ফাইলের চেকমার্ক `[x]` করে দেব এবং আপনাকে জানাব।
> ৪. এরপর আপনি পরবর্তী টাস্কের প্রম্পটটি কপি করে চ্যাটে দেবেন। এভাবে একে একে সব কাজ শেষ হবে।

---

## 📋 Production Readiness Checklist (Core v1.0)

- [x] **Task 1 (C2): Responsive Layouts & Mobile Card Views**
- [x] **Task 2 (C3): Web Deployment, CDN & Production Security Headers**
- [ ] **Task 3 (C4): Playwright Critical Flows (Web ⇄ Desktop Parity E2E)**
- [ ] **Task 4 (C5): Pre-Launch Security & Release Gate (Final Sign-off)**

---

### 🔹 Task 1 (C2) — Responsive Layouts & Mobile Card Views

- **আইডি:** `C2`
- **উদ্দেশ্য:** ওয়েব অ্যাপ্লিকেশনকে মোবাইল ও ট্যাবলেট স্ক্রিনে সম্পূর্ণ ব্যবহারোপযোগী করা যাতে কোনো অনুভূমিক (horizontal) স্ক্রল ছাড়াই সব স্ক্রিন নিখুঁতভাবে দেখা যায়।
- **যেসব ক্ষেত্রে কাজ হবে:**
  1. `packages/ui`: রেসপনসিভ ব্রেকপয়েন্ট এবং ছোট স্ক্রিনের জন্য `DataTable`-কে কার্ড ভিউতে রূপান্তর।
  2. `packages/features`: বুকিং উইজার্ড, ড্রয়ার এবং ফিল্টার প্যানেলগুলোর মোবাইল অ্যাডাপ্টেশন।
  3. `apps/web`: রেসপনসিভ ন্যাভিগেশন বার ও মোবাইল হ্যামবার্গার ড্রয়ার মেনু।
- **ভেরিফিকেশন:** `pnpm --filter @exzaestate/web test` এবং রেসপনসিভ রেন্ডারিং ভেরিফিকেশন।

> **📋 চ্যাটে পাঠানোর জন্য প্রম্পট (Copy this prompt):**
>
> ```text
> Task C2 শুরু করুন: Responsive Layouts & Mobile Card Views। মোবাইল ও ট্যাবলেট স্ক্রিনের জন্য রেসপনসিভ ব্রেকপয়েন্ট, DataTable কার্ড ভিউ এবং মোবাইল ন্যাভিগেশন বাস্তবায়ন করুন।
> ```

---

### 🔹 Task 2 (C3) — Web Deployment, CDN & Production Security Headers

- **আইডি:** `C3`
- **উদ্দেশ্য:** ওয়েব ক্লায়েন্টকে প্রোডাকশন ডেপ্লয়মেন্টের জন্য প্রস্তুত করা, স্ট্যাটিক হোস্টিং/সিডিএন কনফিগ এবং কঠোর সিকিউরিটি হেডার বসানো।
- **যেসব ক্ষেত্রে কাজ হবে:**
  1. `apps/web/deploy`: Nginx / Cloudflare / Static SPA ক্যাশিং ও ফলব্যাক রুট কনফিগারেশন।
  2. প্রোডাকশন সিকিউরিটি হেডার: CSP (Content Security Policy), HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `frame-ancestors 'none'`।
  3. CI/CD পাইপলাইনে সিকিউরিটি হেডার ভেরিফিকেশন স্ক্রিপ্ট।
- **ভেরিফিকেশন:** সিকিউরিটি হেডার স্ক্যান স্ক্রিপ্ট এবং প্রোডাকশন বিল্ড টেস্ট।

> **📋 চ্যাটে পাঠানোর জন্য প্রম্পট (Copy this prompt):**
>
> ```text
> Task C3 শুরু করুন: Web Deployment, CDN & Security Headers। SPA ডেপ্লয়মেন্ট কনফিগ, ক্যাশিং রুলস এবং প্রোডাকশন সিকিউরিটি হেডার (CSP, HSTS ইত্যাদি) কনফিগার করুন।
> ```

---

### 🔹 Task 3 (C4) — Playwright Critical Flows (Web ⇄ Desktop Parity)

- **আইডি:** `C4`
- **উদ্দেশ্য:** ব্রাউজারে স্বয়ংক্রিয় এন্ড-টু-এন্ড (E2E) টেস্ট চালিয়ে নিশ্চিত করা যে ডেস্কটপ ও ওয়েব উভয় ক্লায়েন্টেই মূল বিজনেস ফ্লো (Golden Flow) নিখুঁতভাবে সিঙ্ক ও কাজ করছে।
- **যেসব ক্ষেত্রে কাজ হবে:**
  1. Golden Flow টেস্ট: Lead Capture ➔ Quotation ➔ Booking Confirmation ➔ Payment ➔ Receipt Generation।
  2. ডেটা ও ক্যালকুলেশন প্যারিটি চেক (ডেস্কটপ এবং ওয়েবের ডেটা ও মোট টাকার হিসাব হুবহু এক)।
  3. CI টেস্ট সুইটে E2E ইন্টিগ্রেশন।
- **ভেরিফিকেশন:** `pnpm test:e2e` এক্সিকিউশন এবং সব টেস্ট পাস হওয়া।

> **📋 চ্যাটে পাঠানোর জন্য প্রম্পট (Copy this prompt):**
>
> ```text
> Task C4 শুরু করুন: Playwright Critical Flows (Web ⇄ Desktop Parity)। ওয়েব ও ডেস্কটপের ক্রিটিক্যাল গোল্ডেন ফ্লো-র জন্য এন্ড-টু-এন্ড (E2E) প্যারিটি টেস্ট নিশ্চিত করুন।
> ```

---

### 🔹 Task 4 (C5) — Pre-Launch Security & Release Gate (Final Sign-off)

- **আইডি:** `C5`
- **উদ্দেশ্য:** প্রোডাকশনে লাইভ করার চূড়ান্ত গেট ও অডিট।
- **যেসব ক্ষেত্রে কাজ হবে:**
  1. `security.md`-র ২২টি প্রোডাকশন সিকিউরিটি চেকলিস্ট পুঙ্খানুপুঙ্খভাবে অডিট ও ভেরিফাই করা।
  2. ডেটাবেস ব্যাকআপ এবং রিস্টোর ড্রিল প্রসিডিউর ভেরিফিকেশন।
  3. প্রোডাকশন এনভায়রনমেন্ট ও সিকিউরিটি ডিপেন্ডেন্সি স্ক্যান (`pnpm check:prelaunch`)।
  4. v1.0 প্রোডাকশন রিলিজ সাইন-অফ সম্পন্ন করা।
- **ভেরিফিকেশন:** `pnpm check:prelaunch` এবং সম্পূর্ণ রিপোজিটরির প্রি-রিলিজ গেট টেস্ট।

> **📋 চ্যাটে পাঠানোর জন্য প্রম্পট (Copy this prompt):**
>
> ```text
> Task C5 শুরু করুন: Pre-Launch Security & Release Gate। security.md-এর ২২টি চেকলিস্ট, ব্যাকআপ রিস্টোর ড্রিল এবং ফাইনাল প্রি-লঞ্চ সিকিউরিটি গেট অডিট করে v1.0 রিলিজ প্রস্তুত করুন।
> ```
