/* ==========================================================================
   Sasan Style Lab — lab.js
     0  utilities + spring
     1  data: styles, services, doctors, schedule
     2  word splitting
     3  per-style motion: intro, art, scroll reveals
     4  style switching + dock + phone preview
     5  hero interactions: parallax, draggable chips, like burst, magnetic
     6  header: glass/hide, nav pill, burger, anchors
     7  services: tilt + spotlight, carousel dots, book-from-card
     8  booking engine
     9  notes panel
    10  boot
   Everything works without GSAP; GSAP only adds choreography.
   ========================================================================== */
(() => {
  'use strict';

  /* ───────────────────────── 0 · utilities ───────────────────────── */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const html = document.documentElement;
  const site = $('#site');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const FINE = matchMedia('(hover: hover) and (pointer: fine)');
  const G = window.gsap || null;
  const ST = window.ScrollTrigger || null;
  if (G && ST) G.registerPlugin(ST);
  const FA_D = '۰۱۲۳۴۵۶۷۸۹';
  const fa = (v) => String(v).replace(/\d/g, (d) => FA_D[d]);
  const faN = new Intl.NumberFormat('fa-IR');
  const toLatin = (s) => String(s).replace(/[۰-۹]/g, (d) => FA_D.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const ic = (id, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } },
  };
  const cssVar = (n) => getComputedStyle(html).getPropertyValue(n).trim();

  /* A critically-damped-ish spring that can be retargeted mid-flight.
     Used for everything the pointer touches (drag, magnet, pills, sheet). */
  class Spring {
    constructor(value = 0, { k = 170, c = 22, m = 1 } = {}) {
      this.x = value; this.v = 0; this.t = value; this.k = k; this.c = c; this.m = m;
      this.raf = 0; this.cb = null; this.done = null;
      this.step = this.step.bind(this);
    }
    on(cb) { this.cb = cb; return this; }
    set(x) { this.stop(); this.x = this.t = x; this.v = 0; if (this.cb) this.cb(x, 0); }
    to(t, v0, done) {
      this.t = t; if (typeof v0 === 'number') this.v = v0; this.done = done || null;
      if (RM.matches) { this.set(t); if (this.done) this.done(); return; }
      if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.step); }
    }
    step(now) {
      const dt = Math.min((now - this.last) / 1000, 1 / 30); this.last = now;
      const a = (-this.k * (this.x - this.t) - this.c * this.v) / this.m;
      this.v += a * dt; this.x += this.v * dt;
      if (Math.abs(this.x - this.t) < 0.01 && Math.abs(this.v) < 0.05) {
        this.x = this.t; this.v = 0; this.raf = 0;
        if (this.cb) this.cb(this.x, 0);
        if (this.done) { const d = this.done; this.done = null; d(); }
        return;
      }
      if (this.cb) this.cb(this.x, this.v);
      this.raf = requestAnimationFrame(this.step);
    }
    stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
  }

  /* ───────────────────────── 1 · data ───────────────────────── */
  const SCORE_LABELS = ['اعتماد', 'تمایز', 'پوست و زیبایی', 'درمان عمومی', 'سرعت اجرا'];
  const STYLES = [
    {
      id: 'clinical', name: 'پزشکی مدرن', sw: ['#0E7C6B', '#DCEDE8'], bg: '#F3F7F6',
      motion: { words: 'blur', dur: .95, stagger: .06, ease: 'expo.out', frame: 'inset', tilt: true,
        cards: { y: 36, autoAlpha: 0, scale: .95, duration: 1.1, ease: 'expo.out' },
        reveal: [{ y: 44, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out' }] },
      tag: 'تمیز، روشن و قابل اعتماد؛ همان حسی که از یک مطب مرتب و مجهز انتظار دارید.',
      mood: 'آرام، شفاف، علمی',
      fit: 'کلینیک‌های چندتخصصی و درمانی که مخاطبشان از هر سنی است؛ از پدربزرگ‌ها تا خانواده‌های جوان.',
      palette: [['#F3F7F6', 'زمینه'], ['#0F2926', 'متن'], ['#0E7C6B', 'سبز جراحی'], ['#DCEDE8', 'نعنایی'], ['#F2B45A', 'کهربایی']],
      fonts: 'وزیرمتن در همه‌جا؛ تیترها با وزن ۸۰۰ و متن با وزن ۴۰۰.',
      motionText: 'کلمه‌ها با کمی تاری از پایین بالا می‌آیند. خط ضربان از حرف «س» شروع می‌شود و کشیده می‌شود، حلقه‌های نبض آرام پخش می‌شوند و کارت‌ها نرم شناورند. روی دسکتاپ کارت خدمات با ماوس کمی کج می‌شود.',
      pros: ['بیشترین حس اعتماد و خوانایی', 'برای همه‌ی سنین راحت است', 'سریع‌ترین سبک برای اجرا و نگهداری'],
      cons: ['بدون عکس واقعی و جزئیات خاص، شبیه سایت‌های درمانی دیگر می‌شود'],
      take: 'انتخاب امن و درست برای یک کلینیک چندتخصصی. اگر این را انتخاب کنید، پیشنهادم این است که یک «امضا» از سبک کلاسیک ایرانی (طاق یا نقش گره) به آن اضافه کنیم تا شبیه هیچ سایت دیگری نباشد.',
      score: [5, 2, 3, 5, 5],
    },
    {
      id: 'noir', name: 'لوکس', sw: ['#C9A96B', '#0D1614'], bg: '#0D1614', mask: true, cursor: true,
      motion: { words: 'mask', dur: 1.25, stagger: .08, ease: 'power4.out', frame: 'arch', tilt: false,
        cards: { y: 50, autoAlpha: 0, duration: 1.4, ease: 'power3.out' },
        reveal: [{ clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power4.inOut' }] },
      tag: 'سبز شیشه‌ای تیره و طلایی شامپاینی، با طاق‌های معماری ایرانی.',
      mood: 'گران، آرام، سینمایی',
      fit: 'کلینیک‌های پوست و زیبایی، جراحی زیبایی و دندانپزشکی زیبایی با خدمات پریمیوم.',
      palette: [['#0D1614', 'سبز شب'], ['#EFE8DA', 'عاجی'], ['#C9A96B', 'شامپاینی'], ['#14201D', 'سطح'], ['#8FA89A', 'مه مریمی']],
      fonts: 'مرکزی (Markazi Text) برای تیترها؛ یک نسخ مدرن و خوش‌تراش. وزیرمتن سبک برای متن.',
      motionText: 'آهسته و سینمایی. کلمه‌ها از پشت یک ماسک بالا می‌آیند، طاق از پایین باز می‌شود، ستاره‌ی هشت‌پر آرام می‌چرخد و روی دسکتاپ یک حلقه‌ی طلایی دنبال ماوس می‌آید.',
      pros: ['بیشترین حس ارزش و تمایز', 'با قیمت‌گذاری بالاتر هماهنگ است', 'عکس پرتره روی زمینه‌ی تیره خیلی خوب می‌نشیند'],
      cons: ['برای بیمار مسن یا خدمات عمومی ممکن است سرد و گران به نظر برسد', 'خواندن متن طولانی روی زمینه‌ی تیره خسته‌کننده‌تر است'],
      take: 'اگر تمرکز کلینیک روی زیبایی است، قوی‌ترین گزینه همین است. برای کلینیک عمومی توصیه نمی‌کنم.',
      score: [4, 5, 5, 2, 3],
    },
    {
      id: 'heritage', name: 'کلاسیک ایرانی', sw: ['#1D3C82', '#2A8C88'], bg: '#F0ECE3',
      motion: { words: 'fade', dur: 1.1, stagger: .07, ease: 'power2.out', frame: 'rise', tilt: false,
        cards: { y: 26, autoAlpha: 0, duration: 1.2, ease: 'power2.out' },
        reveal: [{ y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, ease: 'power2.out' }] },
      tag: 'لاجوردی و فیروزه‌ای کاشی‌های ایرانی، طاق جناغی و نقش گره.',
      mood: 'اصیل، باوقار، ماندگار',
      fit: 'کلینیک‌هایی با سابقه‌ی طولانی و برند خانوادگی، یا مراکزی که روی اعتماد چندنسلی تکیه دارند.',
      palette: [['#F0ECE3', 'کاغذی'], ['#15213F', 'جوهری'], ['#1D3C82', 'لاجوردی'], ['#2A8C88', 'فیروزه‌ای'], ['#B8862B', 'طلایی']],
      fonts: 'امیری برای تیترها (نسخ کلاسیک کتابی) و وزیرمتن برای متن.',
      motionText: 'باوقار و متقارن. طاق کاشی‌کاری‌شده بالا می‌آید، نقش گره خیلی آهسته جابه‌جا می‌شود و کلمه‌ها به‌نرمی ظاهر می‌شوند. خدمات به‌شکل فهرست با خط‌های دوتایی چیده شده‌اند.',
      pros: ['کاملاً ایرانی و متفاوت از قالب‌های خارجی', 'حس سابقه و اعتماد', 'با عکس معماری کلینیک خیلی خوب جفت می‌شود'],
      cons: ['اگر تزئینات زیاد شود قدیمی به نظر می‌رسد', 'خط امیری در اندازه‌های کوچک خوانایی کمتری دارد'],
      take: 'متمایزترین گزینه‌ی «ایرانی». به‌عنوان امضا روی سبک پزشکی مدرن هم عالی جواب می‌دهد.',
      score: [4, 5, 3, 4, 3],
    },
    {
      id: 'swiss', name: 'مینیمال', sw: ['#2B3FE0', '#0B0B0C'], bg: '#F6F6F3', mask: true, cursor: true,
      motion: { words: 'mask', dur: .8, stagger: .045, ease: 'power3.out', frame: 'wipe', tilt: false,
        cards: { xPercent: -14, autoAlpha: 0, duration: .8, ease: 'power3.out' },
        reveal: [{ clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .8, ease: 'power3.inOut' }] },
      tag: 'فقط تایپوگرافی، شبکه و یک رنگ کبالت. هیچ چیز اضافه.',
      mood: 'دقیق، مدرن، مطمئن',
      fit: 'کلینیک‌های تخصصی جوان، مراکز تصویربرداری و آزمایشگاه، و برندی که می‌خواهد مدرن و بی‌ادعا باشد.',
      palette: [['#F6F6F3', 'زمینه'], ['#0B0B0C', 'مشکی'], ['#2B3FE0', 'کبالت'], ['#E4E7FC', 'کبالت روشن'], ['#56565D', 'خاکستری']],
      fonts: 'نوتو کوفی عربی؛ یک کوفی هندسی که در اندازه‌ی بزرگ خیلی قوی است.',
      motionText: 'سریع و دقیق. کلمه‌ها از پشت خط می‌لغزند، قاب مثل پرده از راست کنار می‌رود، خطوط شبکه کشیده می‌شوند و روی دسکتاپ نشانگر مربعی رنگ زیرش را برعکس می‌کند.',
      pros: ['کمترین وابستگی به عکس', 'سبک‌ترین و سریع‌ترین بارگذاری', 'تیترهای بزرگ به‌یادماندنی‌اند'],
      cons: ['برای بعضی بیماران سرد و بی‌روح است', 'هر اشتباه کوچک در فاصله‌ها به چشم می‌آید'],
      take: 'برای مرکز تصویربرداری یا آزمایشگاه عالی است؛ برای کلینیک چندتخصصی کمی خشک است.',
      score: [3, 4, 3, 3, 4],
    },
    {
      id: 'pro', name: 'حرفه‌ای سازمانی', sw: ['#2F6BFF', '#0B1A33'], bg: '#0B1A33',
      motion: { words: 'rise3d', dur: 1, stagger: .05, ease: 'power3.out', frame: 'tilt', tilt: true,
        cards: { rotationX: -38, y: 50, autoAlpha: 0, transformPerspective: 900, transformOrigin: '50% 0%', duration: 1.1, ease: 'power3.out' },
        reveal: [{ rotationX: -28, y: 50, autoAlpha: 0, transformPerspective: 900, transformOrigin: '50% 0%' }, { rotationX: 0, y: 0, autoAlpha: 1, duration: 1, ease: 'power3.out' }] },
      tag: 'سرمه‌ای عمیق و داده‌های زنده؛ کلینیک مثل یک سیستم دقیق و شفاف دیده می‌شود.',
      mood: 'کارآمد، فناورانه، شفاف',
      fit: 'کلینیک‌های بزرگ، مراکز چکاپ شرکتی و قراردادهای سازمانی و بیمه‌ای.',
      palette: [['#0B1A33', 'سرمه‌ای'], ['#F3F5F9', 'زمینه'], ['#2F6BFF', 'آبی'], ['#18C29C', 'سبز زنده'], ['#0D1B30', 'متن']],
      fonts: 'IBM Plex Sans Arabic؛ فونتی مهندسی و خوانا با حس سازمانی.',
      motionText: 'ستون‌های نمودار بالا می‌آیند، کارت‌ها با چرخش سه‌بعدی ظاهر می‌شوند، شمارنده‌ی «در حال رزرو» زنده است و روی دسکتاپ نور لبه‌ی کارت خدمات دنبال ماوس می‌رود.',
      pros: ['شفافیت (زمان انتظار و نوبت‌های خالی) اعتماد می‌سازد', 'برای مخاطب سازمانی جدی و قابل اتکاست'],
      cons: ['بدون داده‌ی واقعی، اعداد ساختگی به اعتبار ضربه می‌زنند', 'به اتصال به سیستم نوبت‌دهی نیاز دارد'],
      take: 'اگر کلینیک بزرگ است و سیستم نوبت‌دهی دارید، این سبک بیشترین ارزش را از آن داده‌ها می‌گیرد.',
      score: [5, 3, 2, 5, 3],
    },
    {
      id: 'lavender', name: 'نرم و دوستانه', sw: ['#9B51E0', '#F3F2F7'], bg: '#F3F2F7', ref: 'تصویر ۱',
      motion: { words: 'pop', dur: .8, stagger: .06, ease: 'back.out(2)', frame: 'pop', tilt: true,
        cards: { y: 70, scale: .8, autoAlpha: 0, duration: .9, ease: 'back.out(1.7)' },
        reveal: [{ y: 60, scale: .9, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: .9, ease: 'back.out(1.5)' }] },
      tag: 'از تصویر اول شما: کارت‌های سفید گرد، کادرهای خط‌چین و دکمه‌ی بنفش درخشان؛ حس یک اپلیکیشن.',
      mood: 'صمیمی، سبک، اپ‌گونه',
      fit: 'مخاطب جوان، دندانپزشکی و پوست، و کلینیکی که بعداً اپلیکیشن موبایل هم می‌خواهد.',
      palette: [['#F3F2F7', 'زمینه'], ['#1C1A22', 'متن و چیپ فعال'], ['#9B51E0', 'بنفش'], ['#F2E8FC', 'یاسی'], ['#F0384B', 'قرمز قلب']],
      fonts: 'استعداد؛ یک فونت فارسی گرد و هندسی.',
      motionText: 'فنری و بازیگوش. قاب مثل حباب باز می‌شود، کلمه‌ها با کمی جهش می‌آیند، زیر کلمه‌ی کلیدی یک ماژیک بنفش کشیده می‌شود و قلب با ذره‌ها می‌ترکد.',
      pros: ['حس اپ مدرن و دوستانه', 'رزرو نوبت در آن خیلی طبیعی جا می‌افتد', 'روی موبایل عالی است'],
      cons: ['بنفش برای حوزه‌های جدی درمانی کمی غیررسمی است'],
      take: 'اگر مخاطب اصلی زیر ۴۰ سال است، این سبک خیلی خوب کار می‌کند. می‌شود بنفش را با سبز یا آبی عوض کرد و همین حس را نگه داشت.',
      score: [3, 4, 4, 3, 4],
    },
    {
      id: 'brutal', name: 'پاستلی جسور', sw: ['#C6BEFA', '#FFE1BF'], bg: '#EEEEF2', ref: 'تصویر ۲',
      motion: { words: 'drop', dur: 1.2, stagger: .07, ease: 'elastic.out(1, .55)', frame: 'drop', tilt: false,
        cards: { y: -60, rotation: () => rand(-9, 9), autoAlpha: 0, duration: 1.2, ease: 'elastic.out(1, .6)' },
        reveal: [{ y: 70, rotation: () => rand(-5, 5), autoAlpha: 0 }, { y: 0, rotation: 0, autoAlpha: 1, duration: 1.1, ease: 'elastic.out(1, .65)' }] },
      tag: 'از تصویر دوم شما: حاشیه‌های مشکی، سایه‌های پله‌ای و رنگ‌های پاستلی؛ شاد و به‌یادماندنی.',
      mood: 'جسور، شاد، متفاوت',
      fit: 'دندانپزشکی کودکان، کلینیک تغذیه و ورزش، و برندی که می‌خواهد در شلوغی دیده شود.',
      palette: [['#EEEEF2', 'زمینه'], ['#16161A', 'مشکی'], ['#C6BEFA', 'یاسی'], ['#FFE1BF', 'هلویی'], ['#80E5D2', 'نعنایی']],
      fonts: 'لاله‌زار برای تیترها (یک فونت نمایشی ایرانی) و وزیرمتن برای متن.',
      motionText: 'کلمه‌ها با فنر می‌افتند، دکمه‌ها واقعاً در سایه‌شان فرو می‌روند، موج‌ها کشیده می‌شوند و کاغذرنگی‌ها شناورند. روی دسکتاپ کارت‌ها با ماوس از سایه‌شان بلند می‌شوند.',
      pros: ['به‌یادماندنی‌ترین سبک', 'در بین سایت‌های پزشکی ایران تقریباً بی‌رقیب', 'تعامل‌ها حس فیزیکی دارند'],
      cons: ['برای خدمات جدی مثل جراحی یا بیماری‌های مزمن بیش از حد شوخ است'],
      take: 'برای یک بخش خاص (مثلاً دندانپزشکی کودکان) یا یک کمپین فوق‌العاده است؛ برای کل کلینیک ریسک دارد.',
      score: [2, 5, 3, 2, 3],
    },
    {
      id: 'organic', name: 'آرامش طبیعی', sw: ['#3E5C3A', '#E9B48A'], bg: '#EDEFE6',
      motion: { words: 'breathe', dur: 1.5, stagger: .09, ease: 'power2.out', frame: 'bloom', tilt: true,
        cards: { y: 30, scale: .94, autoAlpha: 0, duration: 1.5, ease: 'power3.out' },
        reveal: [{ y: 40, scale: .96, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 1.4, ease: 'power3.out' }] },
      tag: 'سبز مریمی و زردآلویی، فرم‌های نرم و زنده؛ حس آرامش قبل از ویزیت.',
      mood: 'آرام، انسانی، گرم',
      fit: 'سلامت روان، تغذیه، زنان و مامایی، فیزیوتراپی و طب مکمل.',
      palette: [['#EDEFE6', 'زمینه'], ['#1F2B1D', 'متن'], ['#3E5C3A', 'خزه‌ای'], ['#DCE4CF', 'مریمی'], ['#E9B48A', 'زردآلویی']],
      fonts: 'المسیری برای تیترها (نرم و خوشنویسانه) و وزیرمتن برای متن.',
      motionText: 'آهسته و نفس‌گونه. قاب مثل یک لکه‌ی زنده شکل عوض می‌کند، برگ آرام تاب می‌خورد، کلمه‌ها با کمی تاری و بزرگ‌نمایی ظاهر می‌شوند و یک بافت دانه‌دانه‌ی ملایم روی کل صفحه هست.',
      pros: ['کمترین استرس برای بیمار نگران', 'گرم و انسانی', 'با عکس‌های نور طبیعی خیلی خوب می‌نشیند'],
      cons: ['برای خدمات فنی و تخصصی ممکن است کمی غیرعلمی به نظر برسد'],
      take: 'اگر روی سلامت زنان، روان یا تغذیه تمرکز دارید، این سبک از همه انسانی‌تر است.',
      score: [4, 4, 4, 3, 3],
    },
    {
      id: 'glass', name: 'شیشه‌ای مات', sw: ['#B9DCFF', '#FFD7C4'], bg: '#E9EFF6', round: 2,
      motion: { words: 'blur', dur: 1.1, stagger: .06, ease: 'expo.out', frame: 'glass', tilt: true,
        cards: { y: 40, scale: .92, autoAlpha: 0, filter: 'blur(12px)', duration: 1.3, ease: 'expo.out' },
        reveal: [{ y: 50, scale: .95, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 1.1, ease: 'expo.out' }] },
      tag: 'کارت‌های شیشه‌ای مات روی رنگ‌های ملایم و زنده، الهام‌گرفته از طراحی جدید اپل (visionOS).',
      mood: 'سبک، روشن، امروزی',
      fit: 'کلینیک‌های پوست و زیبایی و دندانپزشکی که مخاطب جوان و حس «به‌روز بودن» برایشان مهم است.',
      palette: [['#E9EFF6', 'زمینه'], ['#0E1B2B', 'متن و دکمه'], ['#B9DCFF', 'آبی مه'], ['#C4F0DE', 'نعنایی'], ['#FF7A59', 'مرجانی']],
      fonts: 'ریدکس پرو (Readex Pro)؛ فونتی گرد و خوانا با حس فناوری.',
      motionText: 'لکه‌های رنگی پشت صفحه آرام جابه‌جا می‌شوند و شیشه‌ها روی آن‌ها تار می‌کنند. عکس از حالت محو به واضح می‌آید، کارت‌ها با کمی بزرگ‌نمایی ظاهر می‌شوند و روی دسکتاپ نور روی شیشه دنبال ماوس می‌آید.',
      pros: ['خیلی امروزی و شیک، بدون اینکه شلوغ شود', 'عکس‌ها زیر شیشه زیبا دیده می‌شوند', 'برای موبایل هم سبک و تمیز است'],
      cons: ['افکت شیشه روی گوشی‌های خیلی ضعیف سنگین‌تر است', 'متن روی شیشه باید با دقت کنتراست داشته باشد'],
      take: 'یکی از بهترین گزینه‌ها برای ترکیب «شیک + دوستانه». اگر زیبایی و پوست مهم است، کنار «لوکس» جدی بررسی‌اش کنید.',
      score: [4, 4, 5, 4, 3],
    },
    {
      id: 'bento', name: 'اپلی / بنتو', sw: ['#1D1D1F', '#F56300'], bg: '#F5F5F7', round: 2,
      motion: { words: 'rise', dur: .95, stagger: .05, ease: 'power4.out', frame: 'scale', tilt: false,
        cards: { y: 50, autoAlpha: 0, duration: 1, ease: 'power4.out' },
        reveal: [{ y: 60, scale: .97, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 1, ease: 'power4.out' }] },
      tag: 'مثل صفحه‌ی معرفی محصولات اپل: خاکستری روشن، کاشی‌های سفید، تیترهای درشت و عکس‌هایی که با اسکرول بزرگ می‌شوند.',
      mood: 'دقیق، ممتاز، آرام',
      fit: 'کلینیکی که می‌خواهد مثل یک برند درجه‌یک دیده شود؛ برای همه‌ی سنین هم قابل‌فهم است.',
      palette: [['#F5F5F7', 'زمینه'], ['#FFFFFF', 'کاشی'], ['#1D1D1F', 'متن و دکمه'], ['#F56300', 'نارنجی'], ['#FF2D55', 'صورتی']],
      fonts: 'روبیک (Rubik)؛ هندسی و نرم، شبیه فونت‌های اپل.',
      motionText: 'تیتر با شتاب نرم از پایین بالا می‌آید، عکس اصلی از کوچک به تمام‌قد باز می‌شود و با اسکرول کمی زوم می‌کند. خدمات در کاشی‌های بنتو با اندازه‌های مختلف چیده شده‌اند و فیلتر پزشکان یک کنترل تکه‌ای مثل آیفون است.',
      pros: ['حس کیفیت خیلی بالا بدون تزئین اضافه', 'خوانایی و سادگی برای همه', 'چیدمان بنتو اطلاعات زیاد را مرتب نشان می‌دهد'],
      cons: ['اگر عکس‌های باکیفیت نداشته باشید، ضعیف دیده می‌شود'],
      take: 'اگر عکاسی حرفه‌ای از کلینیک انجام بدهید، این سبک از همه «گران‌تر» دیده می‌شود و در عین حال ساده است.',
      score: [5, 3, 4, 4, 4],
    },
    {
      id: 'material', name: 'متریال گوگل', sw: ['#8C4A5E', '#FFD9E1'], bg: '#FFF8F8', round: 2,
      motion: { words: 'fadeThrough', dur: .7, stagger: .04, ease: 'expo.out', frame: 'cookie', tilt: false,
        cards: { scale: .9, autoAlpha: 0, duration: .7, ease: 'expo.out' },
        reveal: [{ scale: .92, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .7, ease: 'expo.out' }] },
      tag: 'زبان طراحی Material You گوگل؛ همان چیزی که کاربر اندروید هر روز می‌بیند: رنگ‌های تونال، چیپ‌ها، موج لمس و دکمه‌ی شناور.',
      mood: 'آشنا، دوستانه، کاربردی',
      fit: 'وقتی بیشتر بیماران با گوشی اندروید سایت را باز می‌کنند (در ایران اکثریت) و سادگی استفاده اولویت اول است.',
      palette: [['#FFF8F8', 'زمینه'], ['#8C4A5E', 'رنگ اصلی'], ['#FFD9E1', 'ظرف رنگی'], ['#F6E2E5', 'سطح'], ['#22191B', 'متن']],
      fonts: 'نوتو سنس عربی (Noto Sans Arabic)؛ فونت خود گوگل.',
      motionText: 'هر لمس یک موج (ripple) از زیر انگشت پخش می‌کند. قاب عکس شکل «کلوچه‌ای» متریال دارد و با چرخش باز می‌شود. دکمه‌ی شناور رزرو موقع اسکرول به پایین جمع و موقع بالا رفتن باز می‌شود.',
      pros: ['برای کاربر اندروید کاملاً آشناست؛ بدون آموزش کار می‌کند', 'بازخورد لمسی روشن روی موبایل', 'دکمه‌ی رزرو همیشه در دسترس است'],
      cons: ['ممکن است شبیه «یک اپ گوگل» دیده شود تا یک برند مستقل'],
      take: 'کاربرپسندترین سبک برای موبایل. رنگ صورتی‌گلبهی را می‌شود با رنگ برند عوض کرد و همین حس را نگه داشت.',
      score: [4, 3, 3, 4, 4],
    },
    {
      id: 'access', name: 'دسترس‌پذیر', sw: ['#005EB8', '#FFEB3B'], bg: '#FFFFFF', round: 2,
      motion: { words: 'fade', dur: .45, stagger: .02, ease: 'power2.out', frame: 'fade', tilt: false,
        cards: { y: 12, autoAlpha: 0, duration: .45, ease: 'power2.out' },
        reveal: [{ y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .45, ease: 'power2.out' }] },
      tag: 'به سبک سایت‌های سلامت دولتی انگلستان (NHS و GOV.UK): متن بزرگ، کنتراست بالا، دکمه‌های واضح و نوار تنظیمات دسترس‌پذیری.',
      mood: 'روشن، قابل اعتماد، بی‌ادعا',
      fit: 'کلینیک‌هایی با بیماران مسن، بیماری‌های مزمن، یا هر جایی که «هر کسی باید بتواند نوبت بگیرد» اولویت است.',
      palette: [['#FFFFFF', 'زمینه'], ['#0B0C0C', 'متن'], ['#005EB8', 'آبی لینک'], ['#007F3B', 'سبز دکمه'], ['#FFEB3B', 'زرد فوکوس']],
      fonts: 'وزیرمتن در اندازه‌ی بزرگ‌تر؛ خواناترین فونت فارسی.',
      motionText: 'حرکت‌ها کوتاه و فقط برای راهنمایی‌اند. بالای صفحه می‌شود متن را بزرگ کرد، کنتراست بالا را روشن کرد یا همه‌ی حرکت‌ها را متوقف کرد. فوکوس کیبورد زرد و خیلی واضح است و دکمه‌ها موقع فشار واقعاً پایین می‌روند.',
      pros: ['بیشترین کاربرپسندی برای همه‌ی سنین', 'برای سئو و قوانین دسترس‌پذیری عالی', 'هشدار «اورژانس نیستیم» واضح دیده می‌شود'],
      cons: ['کمترین جذابیت بصری و تمایز'],
      take: 'حتی اگر این سبک را انتخاب نکنید، پیشنهادم این است که نوار تنظیمات متن و کنتراست آن را به سایت نهایی اضافه کنیم.',
      score: [5, 2, 2, 5, 5],
    },
    {
      id: 'editorial', name: 'مجله‌ای', sw: ['#111111', '#D6382B'], bg: '#FFFFFF', mask: true, round: 2,
      motion: { words: 'mask', dur: 1.15, stagger: .06, ease: 'power4.out', frame: 'curtain', tilt: false,
        cards: { y: 40, autoAlpha: 0, duration: 1.1, ease: 'power3.out' },
        reveal: [{ clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power4.inOut' }] },
      tag: 'مثل یک مجله‌ی سلامت: عکس‌های بزرگ سیاه‌وسفید که با لمس رنگی می‌شوند، تیترهای نسخ درشت و برچسب‌های قرمز.',
      mood: 'فرهیخته، روایی، معتبر',
      fit: 'کلینیکی که محتوای آموزشی و مجله‌ی سلامت پررنگ دارد، یا می‌خواهد «متخصص و معتبر» دیده شود.',
      palette: [['#FFFFFF', 'کاغذ'], ['#111111', 'جوهر'], ['#D6382B', 'قرمز مجله'], ['#F6F4F1', 'کاغذ کاهی'], ['#4D4D4D', 'متن دوم']],
      fonts: 'نوتو نسخ عربی (Noto Naskh Arabic) برای تیترها و وزیرمتن برای متن.',
      motionText: 'تیتر از پشت ماسک بالا می‌آید، عکس روی جلد مثل پرده از بالا باز می‌شود و آرام زوم‌بک می‌کند. عکس‌ها سیاه‌وسفیدند و با نزدیک شدن ماوس رنگی می‌شوند؛ خدمات مثل ستون‌های یک مجله چیده شده‌اند.',
      pros: ['با محتوای زیاد (مقاله، سؤال‌های پرتکرار) عالی کار می‌کند', 'حس اعتبار و تخصص', 'بسیار متفاوت از سایت‌های پزشکی رایج'],
      cons: ['به عکس‌های خوب و متن‌نویسی حرفه‌ای وابسته است'],
      take: 'اگر برنامه دارید مجله‌ی سلامت و سئو را جدی بگیرید، این سبک بهترین بستر است.',
      score: [4, 5, 4, 3, 3],
    },
    {
      id: 'kinetic', name: 'حرکتی (آوواردز)', sw: ['#FF8A5B', '#111010'], bg: '#111010', mask: true, cursor: true, round: 2,
      motion: { words: 'skew', dur: 1.15, stagger: .07, ease: 'power4.out', frame: 'oval', tilt: true,
        cards: { y: 70, rotation: () => rand(-6, 6), autoAlpha: 0, duration: 1.2, ease: 'expo.out' },
        reveal: [{ y: 80, skewY: 4, autoAlpha: 0 }, { y: 0, skewY: 0, autoAlpha: 1, duration: 1.1, ease: 'expo.out' }] },
      tag: 'سبک سایت‌های برنده‌ی جایزه (Awwwards): تایپوگرافی عظیم، نوار متن متحرک، عکس بیضی و پیش‌نمایش تصویری که دنبال ماوس می‌آید.',
      mood: 'جسور، سینمایی، پرانرژی',
      fit: 'برندی که می‌خواهد «خفن» و متفاوت دیده شود؛ کلینیک زیبایی یا دندانپزشکی با مخاطب جوان و شبکه‌های اجتماعی فعال.',
      palette: [['#111010', 'مشکی گرم'], ['#F2EFEA', 'استخوانی'], ['#FF8A5B', 'هلویی تند'], ['#1B1A19', 'سطح'], ['#A8A39B', 'متن دوم']],
      fonts: 'کوفام (Kufam) برای تیترهای عظیم و وزیرمتن برای متن.',
      motionText: 'کلمه‌ها با کمی کجی از پشت ماسک می‌آیند، عکس از یک بیضی کوچک باز می‌شود، نوار متن مدام حرکت می‌کند و عکس‌ها با سرعت اسکرول کمی کج می‌شوند. روی دسکتاپ با رفتن روی هر خدمت، عکسش دنبال ماوس می‌آید.',
      pros: ['به‌یادماندنی‌ترین و «خفن‌ترین» سبک', 'حس برند مد و لایف‌استایل', 'برای ویدیو و شبکه‌های اجتماعی هماهنگ است'],
      cons: ['برای بیمار مسن ممکن است شلوغ و گیج‌کننده باشد', 'اجرای درستش روی موبایل‌های ضعیف دقت می‌خواهد'],
      take: 'اگر کلینیک زیبایی است و می‌خواهید در اینستاگرام دیده شوید، عالی است. برای کلینیک عمومی، فقط بخشی از حرکت‌هایش را قرض بگیریم.',
      score: [3, 5, 4, 2, 2],
    },
    {
      id: 'clay', name: 'خمیری سه‌بعدی', sw: ['#5B7BFF', '#FF8FB1'], bg: '#E7EDFF', round: 2,
      motion: { words: 'pop', dur: .9, stagger: .06, ease: 'back.out(2.2)', frame: 'jelly', tilt: true,
        cards: { y: 60, scale: .7, autoAlpha: 0, duration: 1.1, ease: 'elastic.out(1, .6)' },
        reveal: [{ y: 60, scale: .85, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 1.1, ease: 'elastic.out(1, .7)' }] },
      tag: 'همه‌چیز پف‌دار و نرم، مثل اسباب‌بازی‌های خمیری؛ کپسول، توپ و حلقه‌ی سه‌بعدی دور عکس شناورند.',
      mood: 'شاد، مهربان، بی‌استرس',
      fit: 'دندانپزشکی کودکان، کلینیک اطفال، یا مرکزی که می‌خواهد ترس بیمار را کم کند.',
      palette: [['#E7EDFF', 'زمینه'], ['#5B7BFF', 'آبی خمیری'], ['#FF8FB1', 'صورتی'], ['#FFD166', 'زرد'], ['#6FE3C1', 'نعنایی']],
      fonts: 'پلی‌پن سنس عربی (Playpen Sans Arabic) برای تیترها؛ حس دست‌نویس و گرد. متن با وزیرمتن.',
      motionText: 'عناصر با فنر می‌پرند و کمی لق می‌زنند. دکمه‌ها موقع ماوس مثل ژله تکان می‌خورند و موقع فشار واقعاً فرو می‌روند. کپسول و توپ‌ها دور عکس شناورند و فیلدهای فرم فرورفته‌اند.',
      pros: ['گرم‌ترین و بی‌استرس‌ترین سبک', 'برای کودکان و خانواده‌ها عالی', 'در بین سایت‌های پزشکی ایران کاملاً متفاوت'],
      cons: ['برای خدمات جدی بزرگسالان کمی کودکانه است'],
      take: 'برای دندانپزشکی یا بخش کودکان فوق‌العاده است. برای کل کلینیک، اگر مخاطب خانواده‌ها هستند، جدی فکر کنید.',
      score: [3, 5, 3, 2, 3],
    },
    {
      id: 'medtech', name: 'پزشکی آینده', sw: ['#9AE6FF', '#06080B'], bg: '#06080B', round: 2,
      motion: { words: 'glitch', dur: .6, stagger: .06, ease: 'steps(5)', frame: 'scan', tilt: true,
        cards: { y: 30, autoAlpha: 0, filter: 'blur(6px)', duration: .9, ease: 'power3.out' },
        reveal: [{ clipPath: 'inset(0% 0% 100% 0%)', autoAlpha: .2 }, { clipPath: 'inset(0% 0% 0% 0%)', autoAlpha: 1, duration: .9, ease: 'power2.inOut' }] },
      tag: 'مثل مراکز چکاپ هوشمند آینده: سیاه عمیق، خطوط آبی یخی، کره‌ی نقطه‌ای که می‌چرخد و خط اسکن که روی آن حرکت می‌کند.',
      mood: 'آینده‌نگر، دقیق، فناورانه',
      fit: 'چکاپ پیشرفته، تصویربرداری، ژنتیک، یا کلینیکی که روی تجهیزات جدید مانور می‌دهد.',
      palette: [['#06080B', 'سیاه'], ['#E6EEF3', 'متن'], ['#9AE6FF', 'آبی یخی'], ['#B7A6FF', 'بنفش داده'], ['#7CF0C0', 'سبز وضعیت']],
      fonts: 'المرعی (Almarai) برای متن و هندجت (Handjet) برای اعداد و داده‌ها.',
      motionText: 'یک کره از ۷۰۰ نقطه می‌چرخد و با ماوس (یا خودکار روی موبایل) جهت عوض می‌کند؛ نقطه‌هایی که خط اسکن از رویشان رد می‌شود روشن می‌شوند. کلمه‌ها دیجیتالی ظاهر می‌شوند و کارت‌ها گوشه‌های «هدف‌گیری» دارند.',
      pros: ['خیلی خاص و «خفن»', 'حس تجهیزات پیشرفته و دقت', 'برای تبلیغات و شبکه‌های اجتماعی جذاب'],
      cons: ['برای بیمار مسن سرد و فنی است', 'تیره بودن برای متن‌های طولانی مناسب نیست'],
      take: 'اگر خدمات چکاپ و تصویربرداری نقطه‌ی قوت شماست، این سبک آن را بهتر از همه نشان می‌دهد.',
      score: [4, 5, 3, 3, 2],
    },
  ];
  const byId = (id) => STYLES.find((s) => s.id === id) || STYLES[0];
  const cur = () => byId(html.dataset.style);

  const SERVICES = [
    { id: 'skin', name: 'پوست، مو و زیبایی', icon: 'sparkles', fee: 850000 },
    { id: 'dental', name: 'دندانپزشکی', icon: 'tooth', fee: 420000, feeNote: 'معاینه' },
    { id: 'internal', name: 'داخلی و چکاپ', icon: 'steth', fee: 690000 },
    { id: 'women', name: 'زنان و مامایی', icon: 'baby', fee: 780000 },
    { id: 'nutrition', name: 'تغذیه و رژیم درمانی', icon: 'salad', fee: 740000 },
    { id: 'physio', name: 'فیزیوتراپی', icon: 'person', fee: 560000, feeNote: 'هر جلسه' },
  ];
  const DOCTORS = [
    { id: 'd1', svc: 'skin', name: 'دکتر نگار فرهمند', title: 'متخصص پوست، مو و زیبایی', rate: '۴٫۹', n: '۶۱۲', av: { photo: 'img/doc-d1.webp', g: 'f', skin: '#E9C4A6', scarf: '#1F2A44', bg: '#CFE3DD' } },
    { id: 'd2', svc: 'skin', name: 'دکتر آرش توکلی', title: 'فلوشیپ لیزر و جوانسازی پوست', rate: '۴٫۸', n: '۳۴۸', av: { photo: 'img/doc-d2.webp', g: 'm', skin: '#D9A98A', hair: '#2B211C', bg: '#DDD5EE', glasses: true } },
    { id: 'd3', svc: 'dental', name: 'دکتر سپیده امینی', title: 'متخصص ارتودنسی', rate: '۴٫۹', n: '۴۲۷', av: { photo: 'img/doc-d3.webp', g: 'f', skin: '#F0CFB4', scarf: '#3B2F4A', bg: '#F3DCC6' } },
    { id: 'd4', svc: 'dental', name: 'دکتر بهرام کاویانی', title: 'جراح دندانپزشک، ایمپلنت', rate: '۴٫۷', n: '۲۹۱', av: { g: 'm', skin: '#C99474', hair: '#6B6B6B', bg: '#D6E6F2', beard: true } },
    { id: 'd5', svc: 'internal', name: 'دکتر مهدی رستگار', title: 'متخصص بیماری‌های داخلی', rate: '۴٫۸', n: '۵۵۳', av: { photo: 'img/doc-d5.webp', g: 'm', skin: '#E0B292', hair: '#1E1A18', bg: '#D9E8D2', beard: true } },
    { id: 'd6', svc: 'internal', name: 'دکتر لیلا صدری', title: 'فوق‌تخصص غدد و متابولیسم', rate: '۴٫۹', n: '۳۸۹', av: { g: 'f', skin: '#EBC3A2', scarf: '#18202E', bg: '#E7DDF3', glasses: true } },
    { id: 'd7', svc: 'women', name: 'دکتر مریم نیک‌پور', title: 'متخصص زنان و زایمان', rate: '۴٫۹', n: '۷۰۴', av: { photo: 'img/doc-d7.webp', g: 'f', skin: '#DDB08E', scarf: '#4A2433', bg: '#F4D9D6' } },
    { id: 'd8', svc: 'women', name: 'دکتر شیرین احمدی', title: 'فلوشیپ ناباروری و درمان', rate: '۴٫۸', n: '۲۶۶', av: { g: 'f', skin: '#F1D0B5', scarf: '#233B3A', bg: '#D8EBE6' } },
    { id: 'd9', svc: 'nutrition', name: 'دکتر کیوان مهرآیین', title: 'دکترای تغذیه‌ی بالینی', rate: '۴٫۷', n: '۳۱۲', av: { g: 'm', skin: '#E3B899', hair: '#3A2A20', bg: '#EFE3C8' } },
    { id: 'd10', svc: 'nutrition', name: 'دکتر الهام زارع', title: 'متخصص تغذیه‌ی ورزشی', rate: '۴٫۸', n: '۱۹۸', av: { photo: 'img/doc-d10.webp', g: 'f', skin: '#E8BE9C', scarf: '#2D3E2B', bg: '#DCE8CF' } },
    { id: 'd11', svc: 'physio', name: 'دکتر پویا شریفی', title: 'دکترای فیزیوتراپی', rate: '۴٫۸', n: '۴۴۰', av: { g: 'm', skin: '#D7A383', hair: '#231C19', bg: '#D5E3F0', glasses: true } },
    { id: 'd12', svc: 'physio', name: 'دکتر ندا یزدانی', title: 'فیزیوتراپیست ورزشی', rate: '۴٫۹', n: '۳۰۵', av: { g: 'f', skin: '#EDC7A8', scarf: '#1D2B4A', bg: '#F0DCCB' } },
  ];
  const svcOf = (id) => SERVICES.find((s) => s.id === id);
  const docOf = (id) => DOCTORS.find((d) => d.id === id);
  const docsOf = (svc) => DOCTORS.filter((d) => d.svc === svc);

  /* Minimal, faceless doctor portraits so the page never shows a grey silhouette. */
  function avatar(a) {
    if (a.photo) return `<img src="${a.photo}" alt="" loading="lazy">`;
    const coat = '#F7F8FA';
    let s = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="${a.bg}"/>`;
    if (a.g === 'f') s += `<path d="M17.5 50C17 34 20 14.5 32 14.5S47 34 46.5 50Z" fill="${a.scarf}"/>`;
    s += `<path d="M9 64c1-12 10-18 23-18s22 6 23 18Z" fill="${coat}"/><path d="M26 46.5 32 56l6-9.5Z" fill="#2E6F66"/>`;
    s += `<rect x="28" y="36" width="8" height="11" rx="3" fill="${a.skin}"/>`;
    if (a.g === 'f') {
      s += `<ellipse cx="32" cy="30" rx="8.8" ry="10.4" fill="${a.skin}"/>`;
      s += `<path d="M21.6 30.5C21.4 20.5 26 16.8 32 16.8s10.6 3.7 10.4 13.7C41 24.2 37 21.6 32 21.6s-9 2.6-10.4 8.9Z" fill="${a.scarf}"/>`;
      s += `<path d="M22.4 37.5c2.8 5 6.2 7.4 9.6 7.4s6.8-2.4 9.6-7.4L45 51H19Z" fill="${a.scarf}"/>`;
    } else {
      s += `<ellipse cx="32" cy="29" rx="9.4" ry="10.8" fill="${a.skin}"/>`;
      s += `<path d="M22.4 27.4C21.8 18.6 26 15 32 15s10.4 3.8 9.7 11.6c-2.3-4-5.8-5.5-10.8-5-4 .4-6.4 2.2-8.5 5.8Z" fill="${a.hair}"/>`;
      if (a.beard) s += `<path d="M23 30.5c0 7.2 4 11.4 9 11.4s9-4.2 9-11.4c-2 5-5 6.6-9 6.6s-7-1.6-9-6.6Z" fill="${a.hair}" opacity=".88"/>`;
    }
    if (a.glasses) s += `<g fill="none" stroke="#1B1B1F" stroke-width="1.3"><circle cx="28" cy="30" r="3.1"/><circle cx="36.2" cy="30" r="3.1"/><path d="M31.1 30h2"/></g>`;
    s += `<path d="M24.5 47.5c-1 6.4 2.6 10 5.6 10" fill="none" stroke="#3A4450" stroke-width="1.3" stroke-linecap="round"/><circle cx="30.6" cy="57.6" r="1.8" fill="#3A4450"/>`;
    return s + '</svg>';
  }

  /* Schedule: deterministic fake calendar so a reload shows the same slots. */
  const AM = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30'];
  const PM = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const mulberry = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const fW = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long' });
  const fD = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric' });
  const fM = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long' });
  const pad = (n) => String(n).padStart(2, '0');
  const DAYS = (() => {
    const out = []; const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const dow = d.getDay(); // 5 = Friday, 4 = Thursday
      out.push({
        i, date: d, key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        wd: fW.format(d), dnum: fD.format(d), mon: fM.format(d),
        rel: i === 0 ? 'امروز' : i === 1 ? 'فردا' : '',
        closed: dow === 5, half: dow === 4,
      });
    }
    return out;
  })();
  const dayOf = (key) => DAYS.find((d) => d.key === key);
  function slotsFor(dayKey, docId) {
    const day = dayOf(dayKey); if (!day || day.closed) return [];
    const r = mulberry(hash(dayKey + docId));
    const full = day.i > 1 && r() < 0.14;
    const now = new Date(); const cutoff = now.getHours() * 60 + now.getMinutes() + 60;
    return (day.half ? AM : AM.concat(PM)).map((t) => {
      const [h, m] = t.split(':').map(Number);
      const past = day.i === 0 && h * 60 + m < cutoff;
      return { t, past, taken: past || full || r() < 0.42 };
    });
  }
  function slotsForPick(dayKey, docId, svc) {
    if (docId !== 'any') return slotsFor(dayKey, docId).map((s) => ({ ...s, doc: docId }));
    const lists = docsOf(svc).map((d) => slotsFor(dayKey, d.id).map((s) => ({ ...s, doc: d.id })));
    if (!lists.length || !lists[0].length) return [];
    return lists[0].map((s, i) => { const free = lists.map((l) => l[i]).find((x) => !x.taken); return free ? { ...free } : { ...s }; });
  }
  const dayLabel = (d) => d.rel || d.wd;
  function firstFree(docIds, svc) {
    for (const d of DAYS) {
      for (const id of docIds) {
        const s = slotsFor(d.key, id).find((x) => !x.taken);
        if (s) return { day: d, t: s.t, doc: id };
      }
    }
    return null;
  }
  const firstFreeText = (ff) => ff ? `${dayLabel(ff.day)} ${fa(ff.t.replace(/^0/, ''))}` : 'این دو هفته پر است';
  const whenText = (dayKey, t) => { const d = dayOf(dayKey); return `${d.rel ? d.rel + '، ' : ''}${d.wd} ${d.dnum} ${d.mon} · ساعت ${fa(t.replace(/^0/, ''))}`; };

  /* ───────────────────────── 2 · word splitting ─────────────────────────
     Persian letters join, so we never split inside a word: only whole words
     become boxes. ZWNJ stays inside the word it belongs to. */
  function splitWords(el) {
    if (el.dataset.splitDone) return;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          if (!n.textContent.trim()) return;
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.className = 'wi'; i.textContent = p;
            w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.matches('svg, .hl-bg')) walk(n);
      });
    };
    walk(el); el.dataset.splitDone = '1';
  }

  /* ───────────────────────── 3 · per-style motion ───────────────────────── */
  const WORDS = {
    blur: (m) => ({ y: 28, autoAlpha: 0, filter: 'blur(10px)', stagger: m.stagger, duration: m.dur, ease: m.ease, clearProps: 'filter' }),
    mask: (m) => ({ yPercent: 118, stagger: m.stagger, duration: m.dur, ease: m.ease }),
    fade: (m) => ({ y: 14, autoAlpha: 0, stagger: m.stagger, duration: m.dur, ease: m.ease }),
    rise3d: (m) => ({ rotationX: -88, yPercent: 30, autoAlpha: 0, transformOrigin: '50% 100%', transformPerspective: 700, stagger: m.stagger, duration: m.dur, ease: m.ease }),
    pop: (m) => ({ y: 40, scale: .4, autoAlpha: 0, stagger: m.stagger, duration: m.dur, ease: m.ease }),
    drop: (m) => ({ y: -80, rotation: () => rand(-16, 16), autoAlpha: 0, stagger: m.stagger, duration: m.dur, ease: m.ease }),
    breathe: (m) => ({ autoAlpha: 0, scale: 1.14, filter: 'blur(9px)', stagger: m.stagger, duration: m.dur, ease: m.ease, clearProps: 'filter' }),
    rise: (m) => ({ y: 56, autoAlpha: 0, stagger: m.stagger, duration: m.dur, ease: m.ease }),
    skew: (m) => ({ yPercent: 120, skewY: 9, stagger: m.stagger, duration: m.dur, ease: m.ease }),
    fadeThrough: (m) => ({ scale: .9, autoAlpha: 0, stagger: m.stagger, duration: m.dur, ease: m.ease }),
    glitch: (m) => ({ autoAlpha: 0, x: () => rand(-26, 26), filter: 'blur(5px)', stagger: m.stagger, duration: m.dur, ease: m.ease, clearProps: 'filter,transform' }),
  };
  const FRAME = {
    inset: [{ clipPath: 'inset(14% 14% 14% 14% round 48px)', autoAlpha: 0 }, { clipPath: 'inset(0% 0% 0% 0% round 36px)', autoAlpha: 1, duration: 1.5, ease: 'expo.out', clearProps: 'clipPath' }],
    arch: [{ clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.7, ease: 'power4.inOut', clearProps: 'clipPath' }],
    rise: [{ y: 60, autoAlpha: 0, scale: .94 }, { y: 0, autoAlpha: 1, scale: 1, duration: 1.6, ease: 'power3.out' }],
    wipe: [{ clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.05, ease: 'power4.inOut', clearProps: 'clipPath' }],
    tilt: [{ rotationX: 32, y: 70, autoAlpha: 0, transformPerspective: 1200, transformOrigin: '50% 100%' }, { rotationX: 0, y: 0, autoAlpha: 1, duration: 1.4, ease: 'power3.out' }],
    pop: [{ scale: .55, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.1, ease: 'back.out(1.6)' }],
    drop: [{ y: -140, rotation: -9, autoAlpha: 0 }, { y: 0, rotation: 0, autoAlpha: 1, duration: 1.5, ease: 'elastic.out(1, .6)' }],
    bloom: [{ scale: .5, autoAlpha: 0, filter: 'blur(24px)' }, { scale: 1, autoAlpha: 1, filter: 'blur(0px)', duration: 2, ease: 'power3.out', clearProps: 'filter' }],
    glass: [{ scale: 1.06, autoAlpha: 0, filter: 'blur(28px)' }, { scale: 1, autoAlpha: 1, filter: 'blur(0px)', duration: 1.7, ease: 'power3.out', clearProps: 'filter' }],
    scale: [{ scale: .8, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.5, ease: 'power4.out' }],
    cookie: [{ rotation: -120, scale: .35, autoAlpha: 0 }, { rotation: 0, scale: 1, autoAlpha: 1, duration: 1.5, ease: 'expo.out' }],
    fade: [{ autoAlpha: 0 }, { autoAlpha: 1, duration: .5, ease: 'power1.out' }],
    curtain: [{ clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'power4.inOut', clearProps: 'clipPath' }],
    oval: [{ clipPath: 'inset(42% 44% 42% 44% round 999px)' }, { clipPath: 'inset(0% 0% 0% 0% round 999px)', duration: 1.7, ease: 'expo.inOut', clearProps: 'clipPath' }],
    jelly: [{ scale: .45, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.5, ease: 'elastic.out(1, .5)' }],
    scan: [{ clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'power2.inOut', clearProps: 'clipPath' }],
  };

  function drawIn(tl, els, at, dur = 1.4, ease = 'power2.inOut') {
    els.forEach((p, i) => {
      const len = p.getTotalLength ? p.getTotalLength() : 1000;
      tl.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: dur, ease, clearProps: 'strokeDasharray,strokeDashoffset' }, typeof at === 'number' ? at + i * .1 : at);
    });
  }

  function artIntro(tl, id, at) {
    const f = $('.hero .frame');
    switch (id) {
      case 'clinical':
        tl.from($('.art-clin .cross', f), { scale: 0, rotation: -40, duration: .9, ease: 'back.out(2.2)' }, at + .6); break;
      case 'noir':
        tl.from($$('.art-noir .ar', f), { scaleY: 0, transformOrigin: '50% 100%', duration: 1.6, stagger: .12, ease: 'power4.out' }, at + .3)
          .from($('.art-noir .star8', f), { scale: 0, rotation: -120, autoAlpha: 0, duration: 2, ease: 'power3.out' }, at + .6)
          .from($('.art-noir .glow', f), { autoAlpha: 0, duration: 2 }, at + .6); break;
      case 'heritage':
        tl.from($('.art-her .girih', f), { scale: 1.25, autoAlpha: 0, duration: 2.2, ease: 'power2.out' }, at); break;
      case 'swiss':
        tl.from($('.art-swiss .big-sin', f), { yPercent: 50, autoAlpha: 0, duration: 1.2, ease: 'power4.out' }, at + .45)
          .from($('.art-swiss .fig', f), { y: -10, autoAlpha: 0, duration: .6 }, at + .9)
          .from($$('.gridlines i'), { scaleY: 0, duration: 1.4, stagger: .06, ease: 'power3.inOut' }, 0); break;
      case 'pro':
        tl.from($$('.art-pro .bars i', f), { scaleY: 0, duration: .9, stagger: .045, ease: 'power3.out' }, at + .5)
          .from($$('.art-pro .pro-top, .art-pro .hours', f), { autoAlpha: 0, y: -8, duration: .6, stagger: .1 }, at + .6); break;
      case 'lavender':
        tl.from($('.art-lav .plate', f), { scale: 0, duration: 1, ease: 'back.out(1.8)' }, at + .3)
          .from($$('.art-lav .dash', f), { scale: .5, autoAlpha: 0, duration: 1, stagger: .1, ease: 'power3.out' }, at + .35)
          .from($('.art-lav .plate-ic', f), { scale: 0, rotation: -90, duration: .9, ease: 'back.out(2.4)' }, at + .6)
          .from($$('.art-lav .dot', f), { scale: 0, duration: .6, stagger: .08, ease: 'back.out(3)' }, at + .7); break;
      case 'brutal':
        drawIn(tl, $$('.deco.waves path'), 0, 1.6, 'power2.out');
        tl.from($$('.deco.conf i'), { scale: 0, rotation: () => rand(-180, 180), duration: .8, stagger: .06, ease: 'back.out(3)' }, .5)
          .from($('.art-brut .sun', f), { scale: 0, duration: 1, ease: 'elastic.out(1, .5)' }, at + .6)
          .from($('.art-brut .big', f), { y: 120, duration: 1.2, ease: 'elastic.out(1, .6)' }, at + .5); break;
      case 'glass': case 'bento': case 'material':
        tl.from($('.art-photo', f), { scale: 1.25, duration: 2, ease: 'power3.out' }, at);
        if (id === 'glass') tl.from($$('.mesh i'), { autoAlpha: 0, scale: .6, duration: 2.2, stagger: .2 }, 0);
        break;
      case 'editorial':
        tl.from($('.art-photo', f), { scale: 1.35, duration: 2.4, ease: 'power3.out' }, at)
          .from($('.ed-cap'), { autoAlpha: 0, y: 10, duration: .8 }, at + 1); break;
      case 'kinetic':
        tl.from($('.art-photo', f), { scale: 1.5, duration: 2.2, ease: 'expo.out' }, at + .2)
          .from($('.kin-band'), { autoAlpha: 0, y: 30, duration: 1, ease: 'power3.out' }, 1.2); break;
      case 'clay':
        tl.from($('.art-photo', f), { scale: .7, autoAlpha: 0, duration: 1.2, ease: 'back.out(1.6)' }, at + .3)
          .from($$('.clayfx i'), { scale: 0, rotation: () => rand(-90, 90), duration: 1.2, stagger: .12, ease: 'elastic.out(1, .45)' }, at + .6); break;
      case 'medtech':
        tl.from($$('.art-med .hud', f), { autoAlpha: 0, x: 12, duration: .5, stagger: .15, ease: 'steps(4)' }, at + .8)
          .from($('.art-med .scan-cv', f), { autoAlpha: 0, scale: .6, duration: 1.6, ease: 'expo.out' }, at + .3); break;
      case 'organic':
        tl.from($$('.art-org .ob', f), { scale: 0, duration: 1.8, stagger: .2, ease: 'power3.out' }, at + .3)
          .from($$('.deco.blobs i'), { autoAlpha: 0, scale: .6, duration: 2.4, stagger: .3 }, 0);
        drawIn(tl, $$('.art-org .leaf path', f), at + .8, 1.6, 'power2.out'); break;
    }
  }

  function highlight(tl, id, at) {
    const hl = $('.hero .hl'); if (!hl) return;
    const bg = $('.hl-bg', hl); const u = $('.hl-u path', hl);
    if (['glass', 'bento', 'editorial', 'kinetic'].includes(id)) return;
    if (['lavender', 'organic', 'material', 'access', 'clay'].includes(id)) {
      tl.fromTo(bg, { scaleX: 0 }, { scaleX: 1, duration: .8, ease: 'power3.inOut' }, at);
    } else if (id !== 'swiss') {
      drawIn(tl, [u], at, id === 'noir' ? 1.4 : .9, id === 'noir' ? 'power3.inOut' : 'power2.out');
    }
  }

  function countUp(els) {
    els.forEach((el) => {
      const to = +el.dataset.count; const suf = el.dataset.suffix; const o = { v: 0 };
      G.to(o, { v: to, duration: to > 1000 ? 2.2 : 1.6, ease: 'power2.out', onUpdate: () => { el.innerHTML = faN.format(Math.round(o.v)) + (suf ? `<small>${suf}</small>` : ''); } });
    });
  }
  function statsFinal() {
    $$('.stats dd').forEach((el) => { const suf = el.dataset.suffix; el.innerHTML = faN.format(+el.dataset.count) + (suf ? `<small>${suf}</small>` : ''); });
  }

  function intro() {
    const s = cur(); const m = s.motion; const hero = $('.hero');
    const tl = G.timeline({ defaults: { ease: m.ease, duration: m.dur } });
    tl.from($$('.hdr .logo, .hdr .nav > a, .hdr-act > *'), { y: -18, autoAlpha: 0, duration: .8, stagger: .05, ease: 'power3.out', clearProps: 'all' }, 0);
    tl.from($('.eyebrow', hero), { y: 14, autoAlpha: 0, duration: .7, ease: 'power3.out', clearProps: 'all' }, .1);
    tl.from($$('.h1 .wi', hero), WORDS[m.words](m), .18);
    highlight(tl, s.id, .18 + m.stagger * 3 + m.dur * .55);
    tl.from($('.lead', hero), { y: 18, autoAlpha: 0, duration: .9, ease: 'power3.out', clearProps: 'all' }, .55);
    tl.from($$('.ctas > *', hero), { y: 18, autoAlpha: 0, stagger: .09, duration: .8, ease: 'power3.out', clearProps: 'transform,translate,scale,rotate,opacity,visibility' }, .7);
    tl.from($('.trust', hero), { y: 14, autoAlpha: 0, duration: .8, ease: 'power3.out', clearProps: 'all' }, .85);
    const f = FRAME[m.frame];
    tl.fromTo($('.frame', hero), f[0], f[1], .25);
    artIntro(tl, s.id, .25);
    drawIn(tl, [$('.pulse .p-line', hero)], .8, 1.9, 'power2.inOut');
    tl.from($('.pulse .p-glow', hero), { autoAlpha: 0, duration: .6 }, 2.4);
    tl.from($$('.fcard .card', hero), { ...m.cards, stagger: .13, clearProps: 'all' }, .75);
    tl.from($$('.tl li', hero), { x: -16, autoAlpha: 0, stagger: .12, duration: .6, ease: 'power3.out' }, 1.3);
    tl.from($$('.stats > div', hero), { y: 24, autoAlpha: 0, stagger: .09, duration: .9, ease: 'power3.out', clearProps: 'all' }, 1.1);
    tl.add(() => countUp($$('.stats dd', hero)), 1.1);
    return tl;
  }

  function reveals() {
    const m = cur().motion;
    $$('.sec-head').forEach((h) => {
      const tl = G.timeline({ scrollTrigger: { trigger: h, start: 'top 84%', once: true } });
      tl.from($('.eyebrow', h), { y: 12, autoAlpha: 0, duration: .6, ease: 'power3.out' })
        .from($$('.h2 .wi', h), WORDS[m.words](m), '<+.05')
        .from($('.sec-lead', h), { y: 16, autoAlpha: 0, duration: .9, ease: 'power3.out' }, '-=.7');
    });
    const cards = $$('.svc-card');
    G.fromTo(cards, m.reveal[0], { ...m.reveal[1], stagger: .09, clearProps: 'transform,translate,rotate,scale,opacity,visibility,clipPath', scrollTrigger: { trigger: '#svcGrid', start: 'top 82%', once: true } });
    G.from($$('.svc-card .svc-ic'), { scale: 0, duration: .8, stagger: .09, delay: .25, ease: 'back.out(2.4)', clearProps: 'all', scrollTrigger: { trigger: '#svcGrid', start: 'top 82%', once: true } });
    G.fromTo('#bk', m.reveal[0], { ...m.reveal[1], clearProps: 'all', scrollTrigger: { trigger: '#bk', start: 'top 86%', once: true } });
    G.from($$('.ftr-col'), { y: 20, autoAlpha: 0, duration: .8, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: '.ftr', start: 'top 92%', once: true } });
    G.fromTo($$('.dcard'), m.reveal[0], { ...m.reveal[1], stagger: .08, clearProps: 'transform,translate,rotate,scale,opacity,visibility,clipPath', scrollTrigger: { trigger: '#dgrid', start: 'top 84%', once: true } });
    G.from('#dfilter', { y: 16, autoAlpha: 0, duration: .7, ease: 'power3.out', clearProps: 'all', scrollTrigger: { trigger: '#dfilter', start: 'top 90%', once: true } });
    G.fromTo('.jr-media', m.reveal[0], { ...m.reveal[1], clearProps: 'transform,opacity,visibility,clipPath', scrollTrigger: { trigger: '.jr-grid', start: 'top 80%', once: true } });
    $$('.jr-step').forEach((st) => G.from($$('.jr-mimg, .jr-n, h3, p, .jr-facts', st), { y: 26, autoAlpha: 0, duration: .8, stagger: .07, ease: 'power3.out', clearProps: 'all', scrollTrigger: { trigger: st, start: 'top 82%', once: true } }));
    G.from($$('.rv-row'), { x: (i) => (i ? 80 : -80), autoAlpha: 0, duration: 1.2, stagger: .15, ease: 'power3.out', clearProps: 'all', scrollTrigger: { trigger: '.rv-rows', start: 'top 88%', once: true } });
  }

  let ctx = null;
  function buildMotion() {
    stopLive();
    if (!G) { startLive(); return; }
    if (ctx) { ctx.revert(); statsFinal(); }
    ctx = G.context(() => {
      if (!RM.matches && !html.classList.contains('still')) { intro(); if (ST) reveals(); styleScrollFx(cur().id); }
    }, site);
    if (ST) ST.refresh();
    startLive();
  }

  /* pro: a live "people booking now" counter */
  let liveT = 0;
  function startLive() {
    if (cur().id !== 'pro') return;
    const el = $('#liveNow'); let n = 3;
    liveT = setInterval(() => {
      n = clamp(n + Math.round(rand(-2, 2)), 1, 7);
      if (G && !RM.matches) G.fromTo(el, { y: 6, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .4 });
      el.textContent = `${fa(n)} نفر در حال رزرو`;
    }, 3200);
  }
  function stopLive() { clearInterval(liveT); }

  /* ───────────────────────── 4 · style switching + dock ───────────────────────── */
  const dkStyles = $('#dkStyles'); const dkInd = $('#dkInd');
  const indX = new Spring(0, { k: 260, c: 26 }); const indW = new Spring(0, { k: 260, c: 26 });
  const paintInd = () => { dkInd.style.transform = `translateX(${indX.x}px)`; dkInd.style.width = `${indW.x}px`; };
  indX.on(paintInd); indW.on(paintInd);

  function renderDock() {
    STYLES.forEach((s, i) => {
      if (s.round === 2 && !$('.dk-sep', dkStyles)) { const sep = document.createElement('span'); sep.className = 'dk-sep'; sep.textContent = 'جدید'; dkStyles.appendChild(sep); }
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'dk-chip'; b.dataset.id = s.id;
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', 'false');
      b.innerHTML = `<i class="sw" style="--a:${s.sw[0]};--b:${s.sw[1]}"></i><span class="k">${fa(i + 1)}</span><span>${s.name}</span>`;
      b.addEventListener('click', (e) => switchTo(s.id, { x: e.clientX || innerWidth / 2, y: e.clientY || innerHeight - 40 }));
      dkStyles.appendChild(b);
    });
    dkStyles.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const i = STYLES.findIndex((s) => s.id === cur().id);
      const n = (i + (e.key === 'ArrowLeft' ? 1 : -1) + STYLES.length) % STYLES.length;
      const chip = $(`.dk-chip[data-id="${STYLES[n].id}"]`); chip.focus();
      const r = chip.getBoundingClientRect(); switchTo(STYLES[n].id, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    });
  }
  function syncDock(instant) {
    const id = cur().id;
    $$('.dk-chip').forEach((c) => c.setAttribute('aria-selected', String(c.dataset.id === id)));
    const chip = $(`.dk-chip[data-id="${id}"]`); if (!chip) return;
    if (instant || !indW.x) { indX.set(chip.offsetLeft); indW.set(chip.offsetWidth); }
    else { indX.to(chip.offsetLeft); indW.to(chip.offsetWidth); }
    centerIn(dkStyles, chip, instant);
  }

  function applyStyle(id) {
    const s = byId(id);
    html.dataset.style = s.id;
    html.classList.toggle('mask-words', !!s.mask);
    store.set('sasan-style', s.id);
    try { history.replaceState(null, '', '#' + s.id); } catch (e) { /* sandboxed */ }
    syncDock(); renderNotes(); setupCursor(); setHlPath(); styleEnterLeave(s.id);
    requestAnimationFrame(() => placeDoctorFilter(true));
    const meta = $('meta[name="theme-color"]'); if (meta) meta.content = s.bg;
  }

  let switching = false;
  function switchTo(id, origin) {
    if (id === cur().id || switching) return;
    const o = origin || { x: innerWidth / 2, y: innerHeight / 2 };
    const r = Math.hypot(Math.max(o.x, innerWidth - o.x), Math.max(o.y, innerHeight - o.y));
    closeMenu();
    if (RM.matches) { applyStyle(id); buildMotion(); return; }
    switching = true;
    if (document.startViewTransition) {
      const vt = document.startViewTransition(() => { applyStyle(id); buildMotion(); });
      vt.ready.then(() => {
        html.animate({ clipPath: [`circle(0px at ${o.x}px ${o.y}px)`, `circle(${r}px at ${o.x}px ${o.y}px)`] },
          { duration: 900, easing: 'cubic-bezier(.76,0,.24,1)', pseudoElement: '::view-transition-new(root)' });
      }).catch(() => {});
      vt.finished.finally(() => { switching = false; });
      return;
    }
    const w = $('#wipe'); w.style.background = byId(id).bg; w.style.visibility = 'visible'; w.style.opacity = '1';
    const anim = w.animate({ clipPath: [`circle(0px at ${o.x}px ${o.y}px)`, `circle(${r}px at ${o.x}px ${o.y}px)`] }, { duration: 650, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' });
    anim.onfinish = () => {
      applyStyle(id); buildMotion();
      const out = w.animate({ opacity: [1, 0] }, { duration: 380, easing: 'ease-out', fill: 'forwards' });
      out.onfinish = () => { w.style.visibility = 'hidden'; anim.cancel(); out.cancel(); switching = false; };
    };
  }

  /* The underline under «شنیدن» changes shape per style. */
  function setHlPath() {
    const p = $('.hero .hl-u path'); if (!p) return;
    const id = cur().id;
    if (id === 'brutal') {
      let d = 'M196 10'; for (let x = 196; x > 8; x -= 16) d += ` q-4 -9 -8 0 t-8 0`;
      p.setAttribute('d', d);
    } else if (id === 'noir' || id === 'heritage') p.setAttribute('d', 'M198 12 L2 12');
    else p.setAttribute('d', 'M196 12 C 140 4, 70 5, 4 13');
  }

  function replay() {
    const run = () => buildMotion();
    if (scrollY > 200) scrollToY(0, run); else run();
  }

  function togglePhone() {
    const on = !html.classList.contains('phone-mode');
    html.classList.toggle('phone-mode', on);
    $('#dkPhone').setAttribute('aria-pressed', String(on));
    scrollToY(0, () => buildMotion(), true);
  }

  /* ───────────────────────── 5 · hero interactions ───────────────────────── */
  function heroParallax() {
    const vis = $('#heroVis'); const cards = $$('.fcard', vis);
    const springs = cards.map((c) => {
      const d = +c.dataset.depth || 20;
      const sx = new Spring(0, { k: 90, c: 16 }); const sy = new Spring(0, { k: 90, c: 16 });
      sx.on((v) => c.style.setProperty('--px', `${v}px`)); sy.on((v) => c.style.setProperty('--py', `${v}px`));
      return { c, d, sx, sy };
    });
    const hero = $('.hero');
    hero.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !FINE.matches) return;
      const r = hero.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1; const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      springs.forEach((s) => { s.sx.to(-nx * s.d); s.sy.to(-ny * s.d * .7); });
    });
    hero.addEventListener('pointerleave', () => springs.forEach((s) => { s.sx.to(0); s.sy.to(0); }));
    /* scroll parallax works on touch screens too */
    let ticking = false;
    const onScroll = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const r = vis.getBoundingClientRect(); const vh = innerHeight;
        if (r.bottom < 0 || r.top > vh) return;
        const p = clamp((vh / 2 - (r.top + r.height / 2)) / vh, -1, 1);
        springs.forEach((s) => s.c.style.setProperty('--sy', `${(-p * s.d * 1.6).toFixed(2)}px`));
      });
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  function dragChips() {
    $$('.drag').forEach((el) => {
      const sx = new Spring(0, { k: 220, c: 14 }); const sy = new Spring(0, { k: 220, c: 14 }); const sr = new Spring(0, { k: 200, c: 12 });
      sx.on((v) => el.style.setProperty('--dx', `${v}px`)); sy.on((v) => el.style.setProperty('--dy', `${v}px`)); sr.on((v) => el.style.setProperty('--dr', `${v}deg`));
      let start = null; let last = null; let vx = 0; let vy = 0;
      el.addEventListener('pointerdown', (e) => {
        el.setPointerCapture(e.pointerId); el.classList.add('dragging');
        start = { x: e.clientX - sx.x, y: e.clientY - sy.x }; last = { x: e.clientX, y: e.clientY, t: performance.now() };
        sx.stop(); sy.stop();
      });
      el.addEventListener('pointermove', (e) => {
        if (!start) return;
        const now = performance.now(); const dt = Math.max(now - last.t, 1);
        vx = (e.clientX - last.x) / dt * 1000; vy = (e.clientY - last.y) / dt * 1000; last = { x: e.clientX, y: e.clientY, t: now };
        sx.set(e.clientX - start.x); sy.set(e.clientY - start.y); sr.to(clamp(vx / 90, -14, 14));
      });
      const end = () => {
        if (!start) return; start = null; el.classList.remove('dragging');
        sx.to(0, vx); sy.to(0, vy); sr.to(0, clamp(-vx / 40, -300, 300));
      };
      el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    });
  }

  function burst(btn) {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'حذف از علاقه‌مندی‌ها' : 'ذخیره‌ی دکتر فرهمند در علاقه‌مندی‌ها');
    if (!on || RM.matches) return;
    const svg = $('svg', btn);
    if (G) G.fromTo(svg, { scale: .4 }, { scale: 1, duration: .7, ease: 'elastic.out(1.2, .4)' });
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('i'); p.className = 'burst';
      if (i % 3 === 0) p.style.background = cssVar('--star') || '#F5A524';
      btn.appendChild(p);
      const a = (i / 10) * Math.PI * 2; const d = rand(22, 36);
      p.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(0)`, opacity: 0 }],
        { duration: rand(500, 750), easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => p.remove();
    }
  }

  function magnetic() {
    $$('.magnetic').forEach((el) => {
      const sx = new Spring(0, { k: 200, c: 15 }); const sy = new Spring(0, { k: 200, c: 15 });
      const paint = () => { el.style.setProperty('--mgx', `${sx.x}px`); el.style.setProperty('--mgy', `${sy.x}px`); };
      sx.on(paint); sy.on(paint);
      el.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = el.getBoundingClientRect();
        sx.to((e.clientX - (r.left + r.width / 2)) * .28); sy.to((e.clientY - (r.top + r.height / 2)) * .38);
      });
      el.addEventListener('pointerleave', () => { sx.to(0); sy.to(0); });
    });
  }

  /* cursor follower for the two styles that want one (desktop only) */
  const cursorEl = $('#cursor');
  const cx = new Spring(-100, { k: 320, c: 30 }); const cy = new Spring(-100, { k: 320, c: 30 });
  const paintCursor = () => { cursorEl.style.transform = `translate3d(${cx.x}px, ${cy.x}px, 0)`; };
  cx.on(paintCursor); cy.on(paintCursor);
  let cursorBound = false;
  function setupCursor() {
    const want = !!cur().cursor && FINE.matches;
    cursorEl.classList.toggle('on', want && cursorBound);
    if (!want || cursorBound) return;
    cursorBound = true;
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !cur().cursor) return;
      cursorEl.classList.add('on'); cx.to(e.clientX); cy.to(e.clientY);
      cursorEl.classList.toggle('big', !!e.target.closest('a, button, input, textarea, .drag'));
    }, { passive: true });
    document.addEventListener('pointerleave', () => cursorEl.classList.remove('on'));
  }

  /* ───────────────────────── 6 · header ───────────────────────── */
  const hdr = $('#hdr'); const burgerBtn = $('#burger'); const mnav = $('#mnav');
  function headerScroll() {
    let lastY = scrollY;
    const on = () => {
      const y = scrollY;
      hdr.classList.toggle('is-scrolled', y > 8);
      const hide = y > 160 && y > lastY + 2 && !mnav.classList.contains('is-open');
      if (y < lastY - 2 || y < 160) hdr.classList.remove('is-hidden'); else if (hide) hdr.classList.add('is-hidden');
      lastY = y;
    };
    addEventListener('scroll', on, { passive: true }); on();
  }
  function navPill() {
    const nav = $('#nav'); const pill = $('.nav-pill', nav);
    const sx = new Spring(0, { k: 300, c: 28 }); const sw = new Spring(0, { k: 300, c: 28 });
    const paint = () => { pill.style.transform = `translateX(${sx.x}px)`; pill.style.width = `${sw.x}px`; };
    sx.on(paint); sw.on(paint);
    pill.style.left = '0'; pill.style.right = 'auto';
    let shown = false;
    $$('a', nav).forEach((a) => a.addEventListener('pointerenter', () => {
      pill.style.width = `${a.offsetWidth}px`;
      const w = pill.offsetWidth; const x = a.offsetLeft + (a.offsetWidth - w) / 2;
      if (!shown) { sx.set(x); sw.set(a.offsetWidth); shown = true; } else { sx.to(x); sw.to(a.offsetWidth); }
      pill.style.opacity = '1';
      $$('a', nav).forEach((o) => o.classList.toggle('is-hot', o === a));
    }));
    nav.addEventListener('pointerleave', () => { pill.style.opacity = ''; shown = false; $$('a', nav).forEach((o) => o.classList.remove('is-hot')); });
  }
  function closeMenu() { mnav.classList.remove('is-open'); burgerBtn.setAttribute('aria-expanded', 'false'); burgerBtn.setAttribute('aria-label', 'باز کردن منو'); }
  function burger() {
    burgerBtn.addEventListener('click', () => {
      const open = !mnav.classList.contains('is-open');
      mnav.classList.toggle('is-open', open);
      burgerBtn.setAttribute('aria-expanded', String(open));
      burgerBtn.setAttribute('aria-label', open ? 'بستن منو' : 'باز کردن منو');
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('#hdr')) closeMenu(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); closeNotes(); } });
  }

  let lenis = null;
  function scrollToY(y, done, instant) {
    if (lenis && !instant) { lenis.scrollTo(y, { duration: 1.1, onComplete: () => done && done() }); return; }
    window.scrollTo({ top: y, behavior: instant || RM.matches ? 'auto' : 'smooth' });
    if (done) setTimeout(done, instant || RM.matches ? 0 : 600);
  }
  function scrollToEl(el) {
    const y = el.getBoundingClientRect().top + scrollY - (hdr.offsetHeight + 12);
    scrollToY(Math.max(0, y));
  }
  function anchors() {
    site.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]'); if (!a) return;
      const id = a.getAttribute('href').slice(1); const t = id && document.getElementById(id);
      if (!t) return;
      e.preventDefault(); closeMenu();
      if (a.dataset.book) { bookFrom(a.dataset.book, a.dataset.doc); return; }
      scrollToEl(t);
    });
  }

  /* ───────────────────────── 7 · services ───────────────────────── */
  function services() {
    const grid = $('#svcGrid');
    $$('.svc-card, .dcard').forEach((card) => {
      const rx = new Spring(0, { k: 180, c: 18 }); const ry = new Spring(0, { k: 180, c: 18 });
      rx.on((v) => card.style.setProperty('--rx', `${v}deg`)); ry.on((v) => card.style.setProperty('--ry', `${v}deg`));
      card.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = card.getBoundingClientRect(); const x = e.clientX - r.left; const y = e.clientY - r.top;
        card.style.setProperty('--mx', `${x}px`); card.style.setProperty('--my', `${y}px`);
        if (!cur().motion.tilt) return;
        rx.to(-((y / r.height) - .5) * 7); ry.to(((x / r.width) - .5) * 9);
      });
      card.addEventListener('pointerleave', () => { rx.to(0); ry.to(0); });
    });
    grid.addEventListener('click', (e) => { const b = e.target.closest('[data-book]'); if (b) bookFrom(b.dataset.book); });
    const dots = $$('#svcDots i');
    grid.addEventListener('scroll', () => {
      const cards = $$('.svc-card', grid); const mid = grid.getBoundingClientRect().left + grid.clientWidth / 2;
      let best = 0; let bd = Infinity;
      cards.forEach((c, i) => { const r = c.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = i; } });
      dots.forEach((d, i) => d.classList.toggle('on', i === best));
    }, { passive: true });
    /* keep the «first free slot» chips honest: computed from the same calendar */
    $$('.svc-card', grid).forEach((card) => {
      const ff = firstFree(docsOf(card.dataset.svc).map((d) => d.id));
      const chip = $('.svc-meta span:last-child', card);
      if (chip && ff) { chip.textContent = `اولین نوبت: ${firstFreeText(ff)}`; chip.classList.toggle('soon', ff.day.i === 0); }
    });
    const heroFF = firstFree(['d1']); const nb = $('.fc-next b');
    if (heroFF && nb) nb.textContent = `${dayLabel(heroFF.day)} · ${fa(heroFF.t.replace(/^0/, ''))}`;
  }

  /* ───────────────────────── 8 · booking ───────────────────────── */
  const bk = { step: 0, svc: null, doc: null, day: null, slot: null, slotDoc: null, name: '', phone: '', note: '', first: false, code: '' };
  const stage = $('#bkStage');
  let autoT = 0;
  const STEP_Q = ['کدام بخش؟', 'کدام پزشک؟', 'چه روزی و چه ساعتی؟', 'نوبت به نام چه کسی؟'];

  function pane0() {
    return `<div class="bk-q"><h3>${STEP_Q[0]}</h3><span>۶ بخش پرمراجعه · بقیه‌ی بخش‌ها با تماس تلفنی</span></div>
    <div class="opts" role="radiogroup" aria-label="بخش">${SERVICES.map((s) => {
      const ff = firstFree(docsOf(s.id).map((d) => d.id));
      return `<button type="button" class="opt" role="radio" aria-checked="${bk.svc === s.id}" data-svc="${s.id}">
        <span class="o-ic">${ic(s.icon)}</span><span><b>${s.name}</b><small>${fa(docsOf(s.id).length)} پزشک · اولین نوبت ${firstFreeText(ff)}</small></span>
        <span class="o-chk">${ic('check')}</span></button>`;
    }).join('')}</div>`;
  }
  function pane1() {
    const s = svcOf(bk.svc); const docs = docsOf(bk.svc); const ffAny = firstFree(docs.map((d) => d.id));
    return `<div class="bk-q"><h3>${STEP_Q[1]}</h3><span>${s.name}</span></div>
    <div class="docs" role="radiogroup" aria-label="پزشک">
      <button type="button" class="opt any" role="radio" aria-checked="${bk.doc === 'any'}" data-doc="any">
        <span class="o-ic">${ic('clock')}</span><span><b>اولین نوبت خالی</b><small>با هر پزشکی از این بخش · ${firstFreeText(ffAny)}</small></span><span class="o-chk">${ic('check')}</span></button>
      ${docs.map((d) => `<button type="button" class="opt" role="radio" aria-checked="${bk.doc === d.id}" data-doc="${d.id}">
        <span class="av">${avatar(d.av)}</span><span><b>${d.name}</b><small>${d.title}</small></span>
        <span class="doc-side"><span class="stars">${ic('star')}<em>${d.rate}</em></span><small>${firstFreeText(firstFree([d.id]))}</small></span>
        <span class="o-chk">${ic('check')}</span></button>`).join('')}
    </div>`;
  }
  function freeCount(day) { return slotsForPick(day.key, bk.doc, bk.svc).filter((x) => !x.taken).length; }
  function pane2() {
    if (!bk.day) { const d = DAYS.find((x) => !x.closed && freeCount(x) > 0); bk.day = d ? d.key : DAYS[0].key; }
    const who = bk.doc === 'any' ? 'اولین نوبت خالی · ' + svcOf(bk.svc).name : docOf(bk.doc).name;
    return `<div class="bk-q"><h3>${STEP_Q[2]}</h3><span>${who}</span></div>
    <div class="dates-wrap"><div class="dates" id="bkDates" role="radiogroup" aria-label="روز">${DAYS.map((d) => {
      const n = d.closed ? 0 : freeCount(d);
      return `<button type="button" class="date" role="radio" aria-checked="${bk.day === d.key}" data-day="${d.key}" ${d.closed ? 'disabled' : ''} aria-label="${d.wd} ${d.dnum} ${d.mon}، ${d.closed ? 'تعطیل' : n ? fa(n) + ' نوبت خالی' : 'همه‌ی نوبت‌ها پر'}">
        <span class="dw">${dayLabel(d)}</span><span class="dd">${d.dnum}</span><span class="dm">${d.mon}</span>
        <span class="df ${n ? '' : 'full'}">${d.closed ? 'تعطیل' : n ? fa(n) + ' خالی' : 'پر'}</span></button>`;
    }).join('')}</div></div>
    <div class="slot-groups" id="bkSlots">${slotsHTML()}</div>`;
  }
  function slotsHTML() {
    const day = dayOf(bk.day); const list = slotsForPick(bk.day, bk.doc, bk.svc);
    const free = list.filter((x) => !x.taken);
    if (!free.length) {
      const next = DAYS.find((d) => d.i > day.i && !d.closed && freeCount(d) > 0);
      const over = day.i === 0 && list.length && list.every((x) => x.past);
      return `<div class="empty"><b>${over ? 'ساعت پذیرش امروز تمام شده است' : `همه‌ی نوبت‌های ${dayLabel(day)} ${day.dnum} ${day.mon} پر شده`}</b>
        <p>${next ? `نزدیک‌ترین روز با نوبت خالی ${dayLabel(next)} ${next.dnum} ${next.mon} است.` : 'در دو هفته‌ی آینده نوبت خالی نیست؛ با پذیرش تماس بگیرید تا در فهرست انتظار قرار بگیرید.'}</p>
        ${next ? `<button type="button" class="btn btn-ghost btn-sm" data-jump="${next.key}"><span>رفتن به ${dayLabel(next)}</span></button>` : ''}</div>`;
    }
    const grp = (title, icon, arr) => arr.length ? `<div class="slot-g"><h4>${ic(icon)}${title} <small>· ${fa(arr.filter((x) => !x.taken).length)} نوبت خالی</small></h4>
      <div class="slots" role="radiogroup" aria-label="${title}">${arr.map((x) => `<button type="button" class="slot" role="radio" aria-checked="${bk.slot === x.t}" data-t="${x.t}" ${x.taken ? 'disabled' : ''} aria-label="ساعت ${fa(x.t)}${x.taken ? (x.past ? '، گذشته' : '، رزرو شده') : ''}">${fa(x.t)}</button>`).join('')}</div></div>` : '';
    return grp('صبح', 'sun', list.filter((x) => x.t < '13:00')) + grp('عصر', 'sunset', list.filter((x) => x.t >= '13:00')) + '<span class="glide" aria-hidden="true"></span>';
  }
  function pane3() {
    return `<div class="bk-q"><h3>${STEP_Q[3]}</h3><span>پیامک تأیید به همین شماره فرستاده می‌شود</span></div>
    <form class="form" id="bkForm" novalidate>
      <div class="field"><label for="bkName">نام و نام خانوادگی</label><input id="bkName" name="name" autocomplete="name" placeholder="مثلاً مریم احمدی" value="${bk.name.replace(/"/g, '&quot;')}"><span class="err" id="eName" aria-live="polite"></span></div>
      <div class="field"><label for="bkPhone">شماره‌ی موبایل</label><input id="bkPhone" name="phone" inputmode="tel" autocomplete="tel" dir="ltr" style="text-align:right" placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹" value="${bk.phone.replace(/"/g, '&quot;')}"><span class="err" id="ePhone" aria-live="polite"></span></div>
      <div class="field full"><label for="bkNote">دلیل مراجعه <em>(اختیاری)</em></label><textarea id="bkNote" name="note" placeholder="مثلاً: جوش‌های صورت از دو ماه پیش">${bk.note.replace(/</g, '&lt;')}</textarea></div>
      <label class="check full" for="bkFirst"><input type="checkbox" id="bkFirst" ${bk.first ? 'checked' : ''}>اولین بار است به کلینیک ساسان می‌آیم</label>
      <button type="submit" hidden></button>
    </form>`;
  }
  function pane4() {
    const d = bk.slotDoc ? docOf(bk.slotDoc) : null; const s = svcOf(bk.svc);
    return `<div class="done">
      <svg class="done-check" viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="34"/><path d="M24 39.5l9.5 9.5L53 29"/></svg>
      <h3>نوبت شما ثبت شد</h3>
      <p>${bk.name ? bk.name + '، ' : ''}منتظرتان هستیم. ۱۰ دقیقه قبل از نوبت در پذیرش طبقه‌ی دوم باشید.</p>
      <div class="ticket">
        <div class="t-row"><span>بخش</span><b>${s.name}</b></div>
        <div class="t-row"><span>پزشک</span><b>${d ? d.name : '—'}</b></div>
        <div class="t-row"><span>زمان</span><b>${whenText(bk.day, bk.slot)}</b></div>
        <div class="t-row"><span>ویزیت</span><b>${faN.format(s.fee)} تومان${s.feeNote ? ' · ' + s.feeNote : ''}</b></div>
        <div class="t-cut" aria-hidden="true"></div>
        <div class="t-code"><div><span style="font-size:.8rem;color:var(--muted)">کد پیگیری</span><br><b id="bkCode">${bk.code}</b></div>
          <button type="button" class="copy-btn" id="bkCopy">${ic('copy')}<span>کپی کد</span></button></div>
      </div>
      <p class="demo-note">این یک نمونه‌ی نمایشی است و نوبتی در سیستم ثبت نشده.</p>
      <div class="done-act">
        <button type="button" class="btn btn-primary btn-sm" data-act="again"><span>گرفتن نوبت دیگر</span></button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="edit">${ic('pencil')}<span>تغییر زمان</span></button>
      </div>
    </div>`;
  }
  const PANES = [pane0, pane1, pane2, pane3, pane4];

  function swapPane(el, dir, instant) {
    const old = stage.querySelector('.bk-pane:not(.leaving)');
    if (!old || instant || !G || RM.matches) { stage.replaceChildren(el); return; }
    const h0 = stage.offsetHeight; const cs = getComputedStyle(stage);
    old.classList.add('leaving');
    old.style.cssText = `position:absolute;top:${cs.paddingTop};right:${cs.paddingRight};left:${cs.paddingLeft};pointer-events:none;`;
    stage.appendChild(el);
    const h1 = stage.offsetHeight;
    const X = 44 * (dir > 0 ? -1 : 1); // RTL: forward content arrives from the left
    G.fromTo(stage, { height: h0 }, { height: h1, duration: .6, ease: 'power3.inOut', clearProps: 'height' });
    G.to(old, { x: -X, autoAlpha: 0, duration: .32, ease: 'power2.in', onComplete: () => old.remove() });
    G.fromTo(el, { x: X, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .6, delay: .1, ease: 'power3.out', clearProps: 'all' });
    G.from($$('.opt, .date, .slot, .field, .check, .slot-g h4, .done > *', el), { y: 14, autoAlpha: 0, duration: .5, stagger: .022, delay: .16, ease: 'power2.out', clearProps: 'all' });
  }

  function go(n, opts = {}) {
    clearTimeout(autoT);
    if (n < 4) { if (n > 0 && !bk.svc) n = 0; if (n > 1 && !bk.doc) n = 1; if (n > 2 && !bk.slot) n = 2; }
    const dir = n >= bk.step ? 1 : -1; bk.step = n;
    const el = document.createElement('div'); el.className = 'bk-pane'; el.innerHTML = PANES[n]();
    swapPane(el, dir, opts.instant);
    if (n === 2) requestAnimationFrame(() => { const sel = $('.date[aria-checked="true"]', el); if (sel) glideTo(sel, true); const s = $('.slot[aria-checked="true"]', el); if (s) glideTo(s, true); centerDate(sel, true); dragScroll($('#bkDates')); });
    if (n === 4) celebrate(el);
    syncChrome();
    if (opts.focus !== false && !opts.instant) { const r = $('#bk').getBoundingClientRect(); if (r.top < 0) scrollToEl($('#bk')); }
  }

  function syncChrome() {
    $$('#bkSteps li').forEach((li, i) => {
      li.classList.toggle('is-active', i === bk.step); li.classList.toggle('is-done', i < bk.step || bk.step === 4);
      const b = $('button', li); const n = $('.n', li);
      const reachable = i === 0 || (i === 1 && bk.svc) || (i === 2 && bk.doc) || (i === 3 && bk.slot);
      b.disabled = !reachable || bk.step === 4; b.setAttribute('aria-current', i === bk.step ? 'step' : 'false');
      n.innerHTML = (i < bk.step || bk.step === 4) ? ic('check') : fa(i + 1);
    });
    $('.bk-bar').style.setProperty('--p', String(Math.min(bk.step + 1, 4) / 4));
    $('#sumStep').textContent = bk.step === 4 ? 'ثبت شد' : `قدم ${fa(bk.step + 1)} از ۴`;
    const s = bk.svc && svcOf(bk.svc); const d = bk.slotDoc ? docOf(bk.slotDoc) : bk.doc && bk.doc !== 'any' ? docOf(bk.doc) : null;
    setSum('svc', s ? s.name : '', 'هنوز انتخاب نشده');
    setSum('doc', d ? d.name : bk.doc === 'any' ? 'اولین نوبت خالی' : '', '—');
    setSum('when', bk.slot ? whenText(bk.day, bk.slot) : '', '—');
    setSum('fee', s ? `${faN.format(s.fee)} تومان${s.feeNote ? ' · ' + s.feeNote : ''}` : '', '—');
    const next = $('#bkNext'); const prev = $('#bkPrev');
    $('.sum-nav').hidden = bk.step === 4;
    prev.style.visibility = bk.step === 0 ? 'hidden' : '';
    next.disabled = (bk.step === 0 && !bk.svc) || (bk.step === 1 && !bk.doc) || (bk.step === 2 && !bk.slot);
    $('#bkNextT').textContent = bk.step === 3 ? 'ثبت نوبت' : 'قدم بعد';
  }
  function setSum(k, val, nil) {
    const dd = $(`.sum-l [data-k="${k}"] dd`); const text = val || nil;
    if (dd.textContent === text) return;
    dd.textContent = text; dd.classList.toggle('nil', !val);
    if (G && !RM.matches && val) G.fromTo(dd, { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .45, ease: 'power3.out' });
  }

  const glideSpring = { x: new Spring(0, { k: 300, c: 26 }), y: new Spring(0, { k: 300, c: 26 }), w: new Spring(0, { k: 300, c: 26 }), h: new Spring(0, { k: 300, c: 26 }) };
  function glideTo(btn, instant) {
    const box = btn.closest('.slot-groups') || null;
    if (!box) return; // dates use their own highlight
    const g = $('.glide', box); if (!g) return;
    const rb = box.getBoundingClientRect(); const r = btn.getBoundingClientRect();
    const t = { x: r.left - rb.left, y: r.top - rb.top, w: r.width, h: r.height };
    const paint = () => { g.style.transform = `translate(${glideSpring.x.x}px, ${glideSpring.y.x}px)`; g.style.width = `${glideSpring.w.x}px`; g.style.height = `${glideSpring.h.x}px`; };
    Object.values(glideSpring).forEach((s) => s.on(paint));
    g.style.left = '0'; g.style.top = '0';
    const fresh = g.style.opacity !== '1';
    ['x', 'y', 'w', 'h'].forEach((k) => (instant || fresh) ? glideSpring[k].set(t[k]) : glideSpring[k].to(t[k]));
    g.style.opacity = '1';
  }
  function centerDate(btn, instant) { if (btn) centerIn(btn.closest('.dates'), btn, instant); }
  const drag = { el: null, x: 0, sl: 0, moved: false, bound: false };
  function dragScroll(el) {
    if (!el || el.dataset.drag) return; el.dataset.drag = '1';
    el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; Object.assign(drag, { el, x: e.clientX, sl: el.scrollLeft, moved: false }); });
    el.addEventListener('click', (e) => { if (drag.moved) { e.stopPropagation(); e.preventDefault(); drag.moved = false; } }, true);
    if (drag.bound) return; drag.bound = true;
    addEventListener('pointermove', (e) => {
      if (!drag.el) return; const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 5) { drag.moved = true; drag.el.classList.add('is-drag'); }
      drag.el.scrollLeft = drag.sl - dx;
    });
    addEventListener('pointerup', () => { const el2 = drag.el; drag.el = null; if (el2) setTimeout(() => el2.classList.remove('is-drag'), 0); });
  }
  function pop(btn) { if (G && !RM.matches) G.fromTo(btn, { scale: .94 }, { scale: 1, duration: .6, ease: 'elastic.out(1.1, .45)', clearProps: 'all' }); }

  function renderSlots(animate) {
    const box = $('#bkSlots'); if (!box) return;
    box.innerHTML = slotsHTML();
    if (animate && G && !RM.matches) G.from($$('.slot, .slot-g h4, .empty', box), { y: 10, autoAlpha: 0, scale: .96, duration: .4, stagger: .014, ease: 'power2.out', clearProps: 'all' });
  }

  function pickDay(key, btn) {
    if (bk.day !== key) { bk.day = key; bk.slot = null; bk.slotDoc = bk.doc === 'any' ? null : bk.doc; }
    $$('.date').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.day === key)));
    if (btn) { pop(btn); centerDate(btn); }
    renderSlots(true); syncChrome();
  }

  function validate(showAll) {
    const name = ($('#bkName') || {}).value || ''; const phoneRaw = ($('#bkPhone') || {}).value || '';
    const phone = toLatin(phoneRaw).replace(/[\s\-()]/g, '').replace(/^(\+98|0098)/, '0');
    let ok = true;
    const setErr = (id, fid, msg) => { const e = $(id); const f = $(fid).closest('.field'); if (e) e.textContent = msg || ''; f.classList.toggle('bad', !!msg); f.classList.toggle('good', !msg && !!$(fid).value.trim()); if (msg) ok = false; };
    const nm = name.trim().length < 3 ? 'نام و نام خانوادگی را بنویسید تا پذیرش شما را بشناسد.' : '';
    const pm = !/^09\d{9}$/.test(phone) ? (phone ? 'شماره‌ی موبایل ۱۱ رقم است و با ۰۹ شروع می‌شود، مثل ۰۹۱۲۳۴۵۶۷۸۹.' : 'شماره‌ی موبایل را بنویسید تا پیامک تأیید را بگیرید.') : '';
    if (showAll || name) setErr('#eName', '#bkName', nm); else if (nm) ok = false;
    if (showAll || phoneRaw) setErr('#ePhone', '#bkPhone', pm); else if (pm) ok = false;
    return ok;
  }
  function submit() {
    if (!validate(true)) {
      const bad = $('.field.bad input');
      if (bad) { bad.focus(); const f = bad.closest('.field'); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); }
      return;
    }
    bk.code = 'س-' + fa(Math.floor(1000 + Math.random() * 9000));
    go(4);
  }

  function celebrate(el) {
    if (!G || RM.matches) return;
    const path = $('.done-check path', el); const circ = $('.done-check circle', el);
    const tl = G.timeline({ delay: .25 });
    tl.from(circ, { scale: 0, transformOrigin: '50% 50%', duration: .7, ease: 'back.out(2)' });
    drawIn(tl, [path], '-=.25', .5, 'power2.out');
    const colors = [cssVar('--accent'), cssVar('--accent-2'), cssVar('--star'), cssVar('--heart'), cssVar('--ok')].filter(Boolean);
    const box = $('.done', el); box.style.position = 'relative';
    for (let i = 0; i < 34; i++) {
      const p = document.createElement('i'); p.className = 'confetti';
      p.style.background = colors[i % colors.length]; p.style.left = '50%'; p.style.top = '38px';
      if (i % 4 === 0) p.style.borderRadius = '50%';
      box.appendChild(p);
      const x = rand(-260, 260); const up = rand(-220, -90);
      G.timeline({ delay: .35 + rand(0, .1), onComplete: () => p.remove() })
        .to(p, { x: x * .6, y: up, rotation: rand(-360, 360), duration: .55, ease: 'power2.out' })
        .to(p, { x, y: up + rand(260, 380), rotation: '+=' + rand(-240, 240), autoAlpha: 0, duration: rand(1, 1.5), ease: 'power1.in' });
    }
  }

  function bookFrom(svc, doc) {
    bk.svc = svc; bk.doc = doc || null; bk.day = null; bk.slot = null; bk.slotDoc = doc || null;
    go(doc ? 2 : 1, { instant: true, focus: false });
    scrollToEl($('#bk'));
    const b = $('#bk');
    if (G && !RM.matches) G.fromTo(b, { boxShadow: `0 0 0 0px ${cssVar('--accent')}` }, { boxShadow: `0 0 0 10px transparent`, duration: 1.2, delay: .8, ease: 'power2.out', clearProps: 'boxShadow' });
  }

  function booking() {
    stage.addEventListener('click', (e) => {
      const t = e.target;
      const svcBtn = t.closest('[data-svc]');
      if (svcBtn) {
        const id = svcBtn.dataset.svc;
        if (bk.svc !== id) { bk.svc = id; bk.doc = null; bk.day = null; bk.slot = null; bk.slotDoc = null; }
        $$('[data-svc]', stage).forEach((b) => b.setAttribute('aria-checked', String(b === svcBtn)));
        pop(svcBtn); syncChrome(); autoT = setTimeout(() => go(1), RM.matches ? 0 : 420); return;
      }
      const docBtn = t.closest('[data-doc]');
      if (docBtn) {
        const id = docBtn.dataset.doc;
        if (bk.doc !== id) { bk.doc = id; bk.day = null; bk.slot = null; bk.slotDoc = id === 'any' ? null : id; }
        $$('[data-doc]', stage).forEach((b) => b.setAttribute('aria-checked', String(b === docBtn)));
        pop(docBtn); syncChrome(); autoT = setTimeout(() => go(2), RM.matches ? 0 : 420); return;
      }
      const dayBtn = t.closest('[data-day]'); if (dayBtn) { pickDay(dayBtn.dataset.day, dayBtn); return; }
      const jump = t.closest('[data-jump]');
      if (jump) { const key = jump.dataset.jump; pickDay(key, $(`.date[data-day="${key}"]`)); return; }
      const slotBtn = t.closest('[data-t]');
      if (slotBtn && !slotBtn.disabled) {
        bk.slot = slotBtn.dataset.t;
        const pick = slotsForPick(bk.day, bk.doc, bk.svc).find((x) => x.t === bk.slot); bk.slotDoc = pick ? pick.doc : bk.doc;
        $$('[data-t]', stage).forEach((b) => b.setAttribute('aria-checked', String(b === slotBtn)));
        glideTo(slotBtn); pop(slotBtn); syncChrome();
        const nb = $('#bkNext'); nb.classList.remove('nudge'); void nb.offsetWidth; nb.classList.add('nudge'); return;
      }
      const act = t.closest('[data-act]');
      if (act) {
        if (act.dataset.act === 'again') { Object.assign(bk, { svc: null, doc: null, day: null, slot: null, slotDoc: null, code: '' }); go(0); }
        else { bk.slot = null; go(2); }
        return;
      }
      const copy = t.closest('#bkCopy');
      if (copy) {
        const code = $('#bkCode').textContent; const label = $('span', copy);
        const done = (ok) => { label.textContent = ok ? 'کپی شد' : 'کد انتخاب شد'; setTimeout(() => { label.textContent = 'کپی کد'; }, 1800); };
        const select = () => { const r = document.createRange(); r.selectNodeContents($('#bkCode')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); done(false); };
        try { navigator.clipboard.writeText(code).then(() => done(true), select); } catch (err) { select(); }
      }
    });
    stage.addEventListener('input', (e) => {
      const t = e.target;
      if (t.id === 'bkName') bk.name = t.value; if (t.id === 'bkPhone') bk.phone = t.value; if (t.id === 'bkNote') bk.note = t.value;
      if (t.id === 'bkName' || t.id === 'bkPhone') { const f = t.closest('.field'); if (f.classList.contains('bad')) validate(false); }
    });
    stage.addEventListener('change', (e) => { if (e.target.id === 'bkFirst') bk.first = e.target.checked; });
    stage.addEventListener('focusout', (e) => { if (e.target.id === 'bkName' || e.target.id === 'bkPhone') validate(false); });
    stage.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    $('#bkNext').addEventListener('click', () => { if (bk.step === 3) submit(); else go(bk.step + 1); });
    $('#bkPrev').addEventListener('click', () => go(bk.step - 1));
    $('#bkSteps').addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b && !b.disabled) go(+b.dataset.go); });
    addEventListener('resize', () => { const s = $('.slot[aria-checked="true"]'); if (s) glideTo(s, true); });
    go(0, { instant: true, focus: false });
  }

  /* ───────────────────────── 9 · notes panel ───────────────────────── */
  const notes = $('#notes'); const ntPanel = $('#ntPanel'); let ntTab = 'this';
  const dots = (v) => '●'.repeat(v) + `<i>${'●'.repeat(5 - v)}</i>`;
  function renderNotes() {
    const s = cur(); const i = STYLES.indexOf(s);
    $('#ntK').textContent = `سبک ${fa(i + 1)} از ${fa(STYLES.length)}${s.ref ? ' · بر اساس ' + s.ref + ' شما' : ''}`;
    $('#ntTitle').textContent = s.name; $('#ntTag').textContent = s.tag;
    $$('.nt-tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === ntTab)));
    const body = $('#ntBody');
    if (ntTab === 'this') {
      body.innerHTML = `
        <div class="nt-sec"><h3>حس و حال</h3><p>${s.mood}</p></div>
        <div class="nt-sec"><h3>مناسب برای</h3><p>${s.fit}</p></div>
        <div class="nt-sec"><h3>رنگ‌ها</h3><div class="nt-sw">${s.palette.map(([c, n]) => `<span><i style="background:${c}"></i>${c} · ${n}</span>`).join('')}</div></div>
        <div class="nt-sec"><h3>فونت</h3><p>${s.fonts}</p></div>
        <div class="nt-sec"><h3>حرکت و تعامل</h3><p>${s.motionText}</p></div>
        <div class="nt-sec"><h3>نقاط قوت</h3><ul class="nt-list">${s.pros.map((p) => `<li>${p}</li>`).join('')}</ul></div>
        <div class="nt-sec"><h3>ریسک‌ها</h3><ul class="nt-list">${s.cons.map((p) => `<li>${p}</li>`).join('')}</ul></div>
        <div class="nt-sec"><h3>امتیاز من (از ۵)</h3><div class="nt-meter">${SCORE_LABELS.map((l, k) => `<div><span>${l}</span><b style="--v:${s.score[k]}"></b></div>`).join('')}</div></div>
        <div class="nt-sec nt-take"><h3>نظر من</h3><p>${s.take}</p></div>`;
    } else if (ntTab === 'cmp') {
      body.innerHTML = `<p style="margin:0 0 10px;color:var(--n-muted)">روی هر ردیف بزنید تا همان سبک را ببینید.</p>
        <div class="nt-scroll"><table class="nt-cmp"><thead><tr><th>سبک</th>${SCORE_LABELS.map((l) => `<th>${l}</th>`).join('')}</tr></thead><tbody>
        ${STYLES.map((x) => `<tr class="${x.id === s.id ? 'cur' : ''}" data-id="${x.id}" style="cursor:pointer"><td>${x.name}</td>${x.score.map((v) => `<td class="dots">${dots(v)}</td>`).join('')}</tr>`).join('')}
        </tbody></table></div>
        <div class="nt-sec nt-take" style="margin-top:14px"><h3>جمع‌بندی من</h3><p>برای یک کلینیک چندتخصصی، <b>پزشکی مدرن</b> یا <b>اپلی / بنتو</b> پایه‌ی درستی‌اند و <b>کلاسیک ایرانی</b> بهترین «امضا» برای متمایز شدن است. برای بیشترین کاربرپسندی روی موبایل <b>متریال گوگل</b> و برای بیماران مسن <b>دسترس‌پذیر</b>. اگر تمرکز روی زیبایی است، <b>لوکس</b> یا <b>شیشه‌ای مات</b>؛ و اگر می‌خواهید «خفن» دیده شوید، <b>حرکتی</b> یا <b>پزشکی آینده</b>.</p></div>`;
    } else {
      body.innerHTML = `
        <div class="nt-sec"><h3>۱ · انتخاب سبک</h3><p>یک سبک اصلی انتخاب کنید. می‌توانیم یک عنصر امضا (مثلاً طاق ایرانی یا خط ضربانِ «س») را از سبک دیگری قرض بگیریم.</p></div>
        <div class="nt-sec"><h3>۲ · صفحه‌های سایت کامل</h3><ul class="nt-list">
          <li>خانه، خدمات، و یک صفحه‌ی جدا برای هر بخش (برای سئو و تبلیغات)</li>
          <li>پزشکان: پروفایل هر پزشک با سوابق، نظرات بیماران و نوبت‌های خالی همان پزشک</li>
          <li>نوبت‌دهی آنلاین + پیگیری و لغو نوبت با کد پیگیری</li>
          <li>تعرفه‌ها و بیمه‌های طرف قرارداد</li>
          <li>نمونه‌کار قبل و بعد (برای پوست و دندان، با رضایت بیمار)</li>
          <li>مجله‌ی سلامت و سؤال‌های پرتکرار (مهم‌ترین منبع ورودی از گوگل)</li>
          <li>درباره‌ی ما، تجهیزات، تماس و مسیریابی</li></ul></div>
        <div class="nt-sec"><h3>۳ · چیزهایی که از شما لازم است</h3><ul class="nt-list">
          <li><b>عکس واقعی</b> پزشکان و فضای کلینیک؛ بزرگ‌ترین فرق سایت حرفه‌ای با قالب آماده</li>
          <li>فهرست دقیق بخش‌ها، پزشکان و ساعات حضورشان</li>
          <li>تعرفه‌ها، بیمه‌ها، آدرس، تلفن و لوگو (اگر دارید)</li></ul></div>
        <div class="nt-sec"><h3>۴ · فنی</h3><ul class="nt-list">
          <li>Next.js یا Astro برای سرعت و سئو، GSAP برای انیمیشن‌ها</li>
          <li>پنل ساده برای مدیریت نوبت‌ها و ساعت‌های خالی پزشکان</li>
          <li>پیامک تأیید و یادآوری با سرویس‌هایی مثل کاوه‌نگار یا ملی‌پیامک</li>
          <li>سئوی محلی: پروفایل گوگل و نشان، و داده‌ی ساخت‌یافته‌ی پزشکی</li></ul></div>
        <div class="nt-sec"><h3>۵ · کیفیت</h3><ul class="nt-list">
          <li>همه‌ی انیمیشن‌ها روی موبایل هم اجرا می‌شوند و روی گوشی‌های میان‌رده تست می‌شوند</li>
          <li>اگر کاربر «کاهش حرکت» را در گوشی فعال کرده باشد، انیمیشن‌ها خاموش می‌شوند</li>
          <li>فونت‌ها و تصاویر روی سرور خودمان و با فرمت WebP یا AVIF</li></ul></div>`;
    }
  }
  function openNotes() {
    notes.classList.add('open'); notes.setAttribute('aria-hidden', 'false'); $('#dkNotes').setAttribute('aria-expanded', 'true');
    ntPanel.style.transform = ''; if (lenis) lenis.stop();
    setTimeout(() => $('#ntX').focus(), 50);
  }
  function closeNotes() {
    if (!notes.classList.contains('open')) return;
    notes.classList.remove('open'); notes.setAttribute('aria-hidden', 'true'); $('#dkNotes').setAttribute('aria-expanded', 'false');
    ntPanel.style.transform = ''; if (lenis) lenis.start();
    $('#dkNotes').focus({ preventScroll: true });
  }
  function notesUI() {
    $('#dkNotes').addEventListener('click', () => (notes.classList.contains('open') ? closeNotes() : openNotes()));
    $('#ntX').addEventListener('click', closeNotes); $('#ntScrim').addEventListener('click', closeNotes);
    $$('.nt-tab').forEach((t) => t.addEventListener('click', () => { ntTab = t.dataset.tab; renderNotes(); $('#ntBody').scrollTop = 0; }));
    $('#ntBody').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-id]'); if (tr) { const r = tr.getBoundingClientRect(); switchTo(tr.dataset.id, { x: r.left + r.width / 2, y: r.top + r.height / 2 }); } });
    /* bottom-sheet drag on phones: follows the finger, settles on a spring */
    const head = $('#ntHead'); const sp = new Spring(0, { k: 260, c: 28 });
    sp.on((v) => { ntPanel.style.transform = `translateY(${Math.max(v, 0)}px)`; ntPanel.style.transition = 'none'; });
    let st = null;
    head.addEventListener('pointerdown', (e) => {
      if (innerWidth > 720 || e.target.closest('button')) return;
      head.setPointerCapture(e.pointerId); st = { y: e.clientY, t: performance.now(), last: e.clientY, lt: performance.now(), v: 0 }; sp.stop();
    });
    head.addEventListener('pointermove', (e) => {
      if (!st) return; const now = performance.now();
      st.v = (e.clientY - st.last) / Math.max(now - st.lt, 1); st.last = e.clientY; st.lt = now;
      const dy = e.clientY - st.y; sp.set(dy < 0 ? dy * .25 : dy);
    });
    const end = () => {
      if (!st) return; const dy = sp.x; const h = ntPanel.offsetHeight; const v = st.v; st = null;
      if (v > .6 || (dy > h * .3 && v > -.3)) sp.to(h + 40, v * 1000, () => { ntPanel.style.transition = ''; closeNotes(); sp.set(0); ntPanel.style.transform = ''; ntPanel.style.transition = ''; });
      else sp.to(0, v * 1000, () => { ntPanel.style.transition = ''; ntPanel.style.transform = ''; });
    };
    head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
  }

  /* ───────────────────────── 11 · round-2 sections ───────────────────────── */

  /* scroll an element to the middle of its own scroller without moving the page */
  function centerIn(scroller, el, instant) {
    if (!scroller || !el) return;
    const cr = scroller.getBoundingClientRect(); const er = el.getBoundingClientRect();
    const delta = (er.left + er.width / 2) - (cr.left + cr.width / 2);
    if (Math.abs(delta) < 2) return;
    scroller.scrollBy({ left: delta, behavior: instant || RM.matches ? 'auto' : 'smooth' });
  }

  /* Doctors: filter chips with a sliding indicator; cards re-flow with Flip */
  function doctors() {
    const grid = $('#dgrid'); const filt = $('#dfilter'); if (!grid || !filt) return;
    const ind = $('.df-ind', filt);
    const sx = new Spring(0, { k: 280, c: 28 }); const sw = new Spring(0, { k: 280, c: 28 });
    const paint = () => { ind.style.transform = `translateX(${sx.x}px)`; ind.style.width = `${sw.x}px`; };
    sx.on(paint); sw.on(paint);
    const place = (instant) => {
      const b = $('button[aria-selected="true"]', filt); if (!b) return;
      if (instant || !sw.x) { sx.set(b.offsetLeft); sw.set(b.offsetWidth); } else { sx.to(b.offsetLeft); sw.to(b.offsetWidth); }
    };
    filt.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-f]'); if (!b || b.getAttribute('aria-selected') === 'true') return;
      $$('button[data-f]', filt).forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      place(); centerIn(filt, b);
      const f = b.dataset.f; const cards = $$('.dcard', grid);
      const F = window.Flip; const anim = F && G && !RM.matches && !html.classList.contains('still');
      const state = anim ? F.getState(cards) : null;
      cards.forEach((c) => c.classList.toggle('off', !(f === 'all' || c.dataset.svc === f)));
      if (anim) {
        F.from(state, {
          duration: .65, ease: 'power3.inOut', absolute: true, scale: true,
          onEnter: (els) => G.fromTo(els, { autoAlpha: 0, scale: .85, y: 30 }, { autoAlpha: 1, scale: 1, y: 0, duration: .55, delay: .15, ease: 'power3.out', clearProps: 'transform,opacity,visibility' }),
          onLeave: (els) => G.to(els, { autoAlpha: 0, scale: .85, duration: .35, ease: 'power2.in' }),
        });
      }
      grid.scrollTo({ left: 0, behavior: 'auto' });
    });
    grid.addEventListener('click', (e) => { const b = e.target.closest('.dbtn'); if (b) bookFrom(b.dataset.book, b.dataset.doc); });
    $$('.dcard', grid).forEach((c) => {
      const ff = firstFree([c.dataset.doc]); const nx = $('.dnext', c);
      if (nx && ff) nx.textContent = firstFreeText(ff);
    });
    addEventListener('resize', () => place(true));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => place(true));
    place(true);
    return place;
  }
  let placeDoctorFilter = () => {};

  /* Journey: the step that crosses the middle of the screen owns the photo */
  function journey() {
    const steps = $$('.jr-step'); const imgs = $$('.jr-img'); if (!steps.length) return;
    let cur = 0;
    const set = (i) => {
      if (i === cur) return;
      steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
      imgs.forEach((im, k) => { im.classList.toggle('was', k === cur); im.classList.toggle('is-on', k === i); });
      const old = cur; cur = i;
      setTimeout(() => { if (cur !== old) imgs[old].classList.remove('was'); }, 1100);
      $('#jrNow').textContent = fa(i + 1);
      $('#jrBar').parentElement.style.setProperty('--p', String((i + 1) / steps.length));
    };
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => { if (en.isIntersecting) set(+en.target.dataset.i); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach((s) => io.observe(s));
  }

  /* Reviews: duplicate each track once so the marquee loops without a seam */
  function reviews() {
    $$('.rv-track').forEach((t) => {
      if (t.dataset.dup) return; t.dataset.dup = '1';
      $$('.rv-card', t).forEach((c) => { const d = c.cloneNode(true); d.setAttribute('aria-hidden', 'true'); t.appendChild(d); });
      const w = t.scrollWidth / 2; t.style.setProperty('--rv-d', `${Math.round(w / 38)}s`);
    });
  }

  /* Material: ink ripple from the touch point + a FAB that folds while scrolling down */
  function ripples() {
    const sel = '.btn, .opt, .date, .slot, .dfilter button, .dbtn, .svc-go, .mini-btn, .fab, .like, .nav a, .bk-steps button, .svc-card, .dcard';
    site.addEventListener('pointerdown', (e) => {
      if (cur().id !== 'material' || RM.matches) return;
      const el = e.target.closest(sel); if (!el || el.disabled) return;
      const r = el.getBoundingClientRect(); const d = Math.max(r.width, r.height) * 2.2;
      const rp = document.createElement('span'); rp.className = 'ripple';
      rp.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.appendChild(rp); setTimeout(() => rp.remove(), 700);
    });
    const fab = $('.fab'); let last = scrollY;
    addEventListener('scroll', () => {
      const y = scrollY; if (fab) fab.classList.toggle('mini', y > 420 && y > last); last = y;
    }, { passive: true });
  }

  /* Access: text size / contrast / motion switches, remembered per viewer */
  const A11Y = { fs: +(store.get('sasan-fs') || 1), hc: store.get('sasan-hc') === '1', still: store.get('sasan-still') === '1' };
  function a11yApply(on) {
    html.style.fontSize = on && A11Y.fs !== 1 ? `${A11Y.fs * 100}%` : '';
    html.classList.toggle('hc', on && A11Y.hc);
    html.classList.toggle('still', on && A11Y.still);
    $$('.a11y [data-fs]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.fs === A11Y.fs)));
    $('#a11yHc').setAttribute('aria-pressed', String(A11Y.hc));
    $('#a11yStill').setAttribute('aria-pressed', String(A11Y.still));
  }
  function a11yUI() {
    $$('.a11y [data-fs]').forEach((b) => b.addEventListener('click', () => { A11Y.fs = +b.dataset.fs; store.set('sasan-fs', String(A11Y.fs)); a11yApply(true); if (ST) ST.refresh(); }));
    $('#a11yHc').addEventListener('click', () => { A11Y.hc = !A11Y.hc; store.set('sasan-hc', A11Y.hc ? '1' : '0'); a11yApply(true); });
    $('#a11yStill').addEventListener('click', () => { A11Y.still = !A11Y.still; store.set('sasan-still', A11Y.still ? '1' : '0'); a11yApply(true); buildMotion(); });
  }

  /* Medtech: a 700-point sphere drawn on canvas; the CSS scan line lights up the points it passes */
  const scan = (() => {
    let cv = null; let c2 = null; let raf = 0; let run = false; let pts = []; let mx = 0; let my = 0; let tx = 0; let ty = 0; let seen = true;
    const make = () => {
      const N = 700; const g = Math.PI * (3 - Math.sqrt(5)); pts = [];
      for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2; const r = Math.sqrt(1 - y * y); const t = g * i; pts.push([Math.cos(t) * r, y, Math.sin(t) * r]); }
    };
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2); const w = cv.clientWidth; const h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      return dpr;
    };
    const frame = (t) => {
      if (!run) return; raf = requestAnimationFrame(frame);
      if (!seen) return;
      const dpr = size(); const w = cv.width; const h = cv.height; c2.clearRect(0, 0, w, h);
      mx += (tx - mx) * .05; my += (ty - my) * .05;
      const R = Math.min(w, h) * .34; const ry = t * .00022 + mx * .9; const rx = -.3 + my * .5;
      const cy = Math.cos(ry); const sy = Math.sin(ry); const cx = Math.cos(rx); const sx = Math.sin(rx);
      const scanY = h * (.08 + .84 * (.5 - .5 * Math.cos((t / 4500) * Math.PI * 2)));
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]; const x1 = p[0] * cy + p[2] * sy; const z1 = -p[0] * sy + p[2] * cy;
        const y2 = p[1] * cx - z1 * sx; const z2 = p[1] * sx + z1 * cx; const k = 1 / (1.9 - z2 * .55);
        const X = w / 2 + x1 * R * k * 1.35; const Y = h / 2 + y2 * R * k * 1.35;
        const near = Math.abs(Y - scanY) < 9 * dpr; const a = .16 + .62 * ((z2 + 1) / 2);
        const s = (1.1 + (z2 + 1) * 1.1) * dpr;
        c2.fillStyle = near ? `rgba(220,250,255,${Math.min(1, a + .45)})` : `rgba(154,230,255,${a})`;
        c2.fillRect(X - s / 2, Y - s / 2, near ? s * 1.6 : s, near ? s * 1.6 : s);
      }
    };
    return {
      start() {
        if (run) return; cv = $('.scan-cv'); if (!cv) return; c2 = cv.getContext('2d'); if (!pts.length) make();
        run = true; raf = requestAnimationFrame(frame);
        if (!cv.dataset.bound) {
          cv.dataset.bound = '1';
          $('.hero').addEventListener('pointermove', (e) => { const r = $('.hero').getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - .5) * 2; ty = ((e.clientY - r.top) / r.height - .5) * 2; });
          if ('IntersectionObserver' in window) new IntersectionObserver((en) => { seen = en[0].isIntersecting; }).observe(cv);
        }
      },
      stop() { run = false; cancelAnimationFrame(raf); },
    };
  })();

  /* Kinetic: hovering a service row floats its photo next to the cursor */
  function kineticPreview() {
    const box = $('#kinPrev'); const img = $('img', box);
    const px = new Spring(0, { k: 160, c: 18 }); const py = new Spring(0, { k: 160, c: 18 }); const pr = new Spring(0, { k: 120, c: 14 });
    const paint = () => { box.style.transform = `translate3d(${px.x}px, ${py.x}px, 0) rotate(${pr.x}deg)`; };
    px.on(paint); py.on(paint); pr.on(paint);
    let lastX = 0; let active = null;
    $('#svcGrid').addEventListener('pointermove', (e) => {
      if (cur().id !== 'kinetic' || e.pointerType !== 'mouse') return;
      const card = e.target.closest('.svc-card'); if (!card) return;
      if (card !== active) { active = card; img.src = $('.svc-img img', card).src; if (!box.classList.contains('on')) { px.set(e.clientX); py.set(e.clientY); } box.classList.add('on'); }
      px.to(e.clientX); py.to(e.clientY); pr.to(clamp((e.clientX - lastX) * .6, -12, 12)); lastX = e.clientX;
    });
    $('#svcGrid').addEventListener('pointerleave', () => { active = null; box.classList.remove('on'); pr.to(0); });
  }

  /* per-style scroll effects, built inside the motion context so they revert on switch */
  function styleScrollFx(id) {
    if (!G || !ST) return;
    if (id === 'bento' || id === 'glass') {
      G.fromTo('.hero .art-photo', { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '#heroVis', start: 'top bottom', end: 'bottom 40%', scrub: true } });
    }
    if (id === 'editorial') {
      G.fromTo('.hero .art-photo', { yPercent: -6, scale: 1.14 }, { yPercent: 6, scale: 1.14, ease: 'none', scrollTrigger: { trigger: '#heroVis', start: 'top bottom', end: 'bottom top', scrub: true } });
      $$('.svc-img img').forEach((im) => G.fromTo(im, { yPercent: -5, scale: 1.12 }, { yPercent: 5, scale: 1.12, ease: 'none', scrollTrigger: { trigger: im.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
    }
    if (id === 'kinetic') {
      const skews = $$('.dphoto img, .jr-media, .hero .frame').map((t) => G.quickTo(t, 'skewY', { duration: .6, ease: 'power3' }));
      let settle = 0;
      ST.create({ start: 0, end: 'max', onUpdate: (self) => {
        const v = clamp(self.getVelocity() / -320, -7, 7); skews.forEach((q) => q(v));
        clearTimeout(settle); settle = setTimeout(() => skews.forEach((q) => q(0)), 140);
      } });
    }
  }

  let prevStyle = null;
  function styleEnterLeave(id) {
    if (prevStyle === id) return;
    if (prevStyle === 'access') a11yApply(false);
    if (prevStyle === 'medtech') scan.stop();
    if (prevStyle === 'kinetic') $('#kinPrev').classList.remove('on');
    if (id === 'access') a11yApply(true);
    if (id === 'medtech' && !RM.matches) scan.start();
    prevStyle = id;
  }

  /* ───────────────────────── 10 · boot ───────────────────────── */
  function boot() {
    try { history.scrollRestoration = 'manual'; } catch (e) { /* older browsers */ }
    if (STYLES.some((x) => '#' + x.id === location.hash)) scrollTo(0, 0);
    $$('[data-split]').forEach(splitWords);
    $$('[data-av]').forEach((el) => { const d = docOf(el.dataset.av); if (d) el.innerHTML = avatar(d.av); });
    renderDock();
    applyStyle(cur().id);
    syncDock(true);

    if (window.Lenis && !RM.matches) {
      try {
        lenis = new window.Lenis({ lerp: .1, smoothWheel: true });
        if (G) { if (ST) lenis.on('scroll', ST.update); G.ticker.add((t) => lenis.raf(t * 1000)); G.ticker.lagSmoothing(0); }
        else { const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
      } catch (e) { lenis = null; }
    }

    headerScroll(); navPill(); burger(); anchors();
    heroParallax(); dragChips(); magnetic();
    $('.like').addEventListener('click', (e) => burst(e.currentTarget));
    services(); booking(); notesUI();
    placeDoctorFilter = doctors() || placeDoctorFilter; journey(); reviews(); ripples(); a11yUI(); kineticPreview();
    $('#dkReplay').addEventListener('click', replay);
    $('#dkPhone').addEventListener('click', togglePhone);
    document.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!/^[0-9۰-۹]$/.test(e.key)) return;
      const n = +toLatin(e.key) || 10; if (n <= STYLES.length) switchTo(STYLES[n - 1].id);
    });
    addEventListener('resize', () => syncDock(true));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => syncDock(true));
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => syncDock(true));

    buildMotion();

    if (!store.get('sasan-hint')) {
      const h = $('#dkHint');
      setTimeout(() => h.classList.add('on'), 2600);
      setTimeout(() => { h.classList.remove('on'); store.set('sasan-hint', '1'); }, 7600);
    }
    /* warm the other styles' fonts so a switch never flashes a fallback */
    setTimeout(() => {
      if (!document.fonts || !document.fonts.load) return;
      ['800 1em Vazirmatn', '600 1em "Markazi Text"', '700 1em Amiri', '800 1em "Noto Kufi Arabic"', '700 1em "IBM Plex Sans Arabic"', '800 1em Estedad', '1em Lalezar', '700 1em "El Messiri"', '400 1em "Noto Kufi Arabic"', '400 1em "IBM Plex Sans Arabic"', '400 1em Estedad', '300 1em Vazirmatn', '700 1em "Readex Pro"', '400 1em "Readex Pro"', '700 1em Rubik', '400 1em Rubik', '600 1em "Noto Sans Arabic"', '400 1em "Noto Sans Arabic"', '700 1em "Noto Naskh Arabic"', '800 1em Kufam', '800 1em "Playpen Sans Arabic"', '800 1em Almarai', '400 1em Almarai', '600 1em Handjet']
        .forEach((f) => document.fonts.load(f, 'سلام کلینیک ۱۲۳').catch(() => {}));
    }, 1800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
