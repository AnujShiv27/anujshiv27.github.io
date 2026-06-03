const phoneNumber = window.acharyaConfig?.phone || "+918218433649";
const whatsappNumber = window.acharyaConfig?.whatsapp || "918218433649";
const acharyaImage = window.acharyaConfig?.acharyaImage || "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=880&q=80";

// Load acharya image from config
const acharyaImgElement = document.getElementById("acharyaImage");
if (acharyaImgElement) {
  acharyaImgElement.src = acharyaImage;
}

const services = [
  { title: "Astrology Consultation", icon: "images/icon-astrology.png", description: "Precise astrology readings for life, relationships, career, marriage, and destiny. Personalized guidance based on your birth chart.", price: "Price: Call for Details" },
  { title: "Janampatri Making", icon: "images/icon-janampatri.png", description: "Authentic birth chart (Kundli) creation with detailed life predictions, planetary analysis, and remedial suggestions.", price: "Price: Call for Details" },
  { title: "Vastu Consultation - Home Visit", icon: "images/icon-vastu-home.png", description: "Professional in-person vastu inspection and customized solutions for your home's energy and prosperity.", price: "Price: Call for Details" },
  { title: "Vastu Consultation - Online", icon: "images/icon-vastu-online.png", description: "Remote vastu guidance through video consultation for home, office, or business from anywhere.", price: "Price: Call for Details" },
  { title: "Learn Astrology & Vastu", icon: "images/icon-learn.png", description: "Educational sessions to learn the basics of Vedic Astrology and Vastu Shastra at your own pace.", price: "Price: Call for Details" },
];

const servicesGrid = document.getElementById("servicesGrid");

services.forEach((service, index) => {
  const card = document.createElement("article");
  card.className = "services-card glass-card animate-up";
  if (index % 3 === 1) card.classList.add("delay-1");
  if (index % 3 === 2) card.classList.add("delay-2");
  card.innerHTML = `
    <div class="service-icon"><img src="${service.icon}" alt="${service.title}" /></div>
    <h3>${service.title}</h3>
    <p>${service.description}</p>
    <div class="service-meta">
      <span>${service.price}</span>
      <span>Premium Support</span>
    </div>
    <div class="service-actions">
      <a href="tel:${phoneNumber}" class="btn btn-primary"><i class="fas fa-phone-alt"></i> Call</a>
      <a href="https://wa.me/${whatsappNumber}" target="_blank" rel="noreferrer" class="btn btn-secondary"><i class="fab fa-whatsapp"></i> WhatsApp</a>
    </div>
  `;
  servicesGrid.appendChild(card);
});

const navLinks = document.querySelectorAll(".nav-link");
const sections = Array.from(document.querySelectorAll("main section[id], footer"));
const backToTop = document.getElementById("backToTop");
const navToggle = document.querySelector(".nav-toggle");
const navLinksContainer = document.getElementById("navLinks");

const handleScroll = () => {
  const scrollPosition = window.scrollY + 240;
  sections.forEach((section) => {
    if (!section.id) return;
    const top = section.offsetTop;
    const height = section.offsetHeight;
    const link = document.querySelector(`.nav-link[href="#${section.id}"]`);
    if (scrollPosition >= top && scrollPosition < top + height) {
      navLinks.forEach((link) => link.classList.remove("active"));
      if (link) link.classList.add("active");
    }
  });

  if (window.scrollY > 500) {
    backToTop.classList.add("show");
  } else {
    backToTop.classList.remove("show");
  }
};

window.addEventListener("scroll", handleScroll);

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

navToggle.addEventListener("click", () => {
  navLinksContainer.classList.toggle("open");
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    navLinksContainer.classList.remove("open");
  });
});

const faqCards = document.querySelectorAll(".faq-card");
faqCards.forEach((card) => {
  const toggle = card.querySelector(".faq-toggle");
  toggle.addEventListener("click", () => {
    card.classList.toggle("active");
  });
});

const contactForm = document.getElementById("contactForm");
if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    alert("Thank you! Your inquiry has been noted. Please call or WhatsApp for immediate support.");
    contactForm.reset();
  });
}

window.addEventListener("load", () => {
  const loader = document.getElementById("pageLoader");
  if (loader) {
    loader.style.opacity = "0";
    setTimeout(() => loader.remove(), 600);
  }
});

// Intersection observer for scroll reveal animation
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = "running";
      }
    });
  },
  { threshold: 0.15 }
);

const animatedElements = document.querySelectorAll(".animate-up");
animatedElements.forEach((element) => {
  element.style.animationPlayState = "paused";
  observer.observe(element);
});

// Lightbox for gallery images
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxClose = document.getElementById("lightboxClose");

document.querySelectorAll(".lightbox-trigger").forEach((img) => {
  img.style.cursor = "zoom-in";
  img.addEventListener("click", (e) => {
    e.stopPropagation();
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightbox.style.display = "flex";
    document.body.style.overflow = "hidden";
  });
});

const closeLightbox = () => {
  lightbox.style.display = "none";
  document.body.style.overflow = "";
};

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", closeLightbox);
lightboxImg.addEventListener("click", (e) => e.stopPropagation());

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeLightbox();
    closePostModal();
  }
});

// ── Posts System ──
const postsGrid = document.getElementById("postsGrid");
const postModal = document.getElementById("postModal");
const postModalClose = document.getElementById("postModalClose");

const parseTxt = (text) => {
  const lines = text.split("\n");
  const meta = {};
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "---") { bodyStart = i + 1; break; }
    const colonIdx = line.indexOf(":");
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const val = line.slice(colonIdx + 1).trim();
      meta[key] = val;
      bodyStart = i + 1;
    }
  }
  meta.body = lines.slice(bodyStart).join("\n").trim();
  return meta;
};

const closePostModal = () => {
  postModal.style.display = "none";
  document.body.style.overflow = "";
};

postModalClose.addEventListener("click", closePostModal);
postModal.addEventListener("click", (e) => {
  if (e.target === postModal) closePostModal();
});

const openPost = (slug, meta, imgSrc) => {
  document.getElementById("postModalTitle").textContent = meta.title || slug;
  document.getElementById("postModalDate").textContent = meta.date || "";
  document.getElementById("postModalCategory").textContent = meta.category || "";
  document.getElementById("postModalBody").textContent = meta.body || "";
  const modalImg = document.getElementById("postModalImg");
  if (imgSrc) {
    modalImg.src = imgSrc;
    modalImg.style.display = "block";
  } else {
    modalImg.style.display = "none";
  }
  postModal.style.display = "flex";
  document.body.style.overflow = "hidden";
};

const tryImage = (slug) => {
  const exts = ["jpg", "jpeg", "png", "webp"];
  return new Promise((resolve) => {
    let i = 0;
    const tryNext = () => {
      if (i >= exts.length) { resolve(null); return; }
      const img = new Image();
      img.src = `images/posts/${slug}.${exts[i]}`;
      img.onload = () => resolve(img.src);
      img.onerror = () => { i++; tryNext(); };
    };
    tryNext();
  });
};

fetch("posts/index.json")
  .then((r) => r.json())
  .then(async (slugs) => {
    postsGrid.innerHTML = "";
    if (!slugs.length) {
      postsGrid.innerHTML = "<p style='text-align:center;opacity:0.6;'>Abhi koi post nahi hai.</p>";
      return;
    }
    for (const slug of slugs) {
      const [txtRes, imgSrc] = await Promise.all([
        fetch(`posts/${slug}.txt`).then((r) => r.text()),
        tryImage(slug),
      ]);
      const meta = parseTxt(txtRes);
      const card = document.createElement("div");
      card.className = "post-card";
      card.innerHTML = `
        ${imgSrc
          ? `<img class="post-card-img" src="${imgSrc}" alt="${meta.title || slug}" />`
          : `<div class="post-card-img-placeholder"><i class="fas fa-feather-alt"></i></div>`}
        <div class="post-card-body">
          <span class="post-card-category">${meta.category || "Post"}</span>
          <div class="post-card-title">${meta.title || slug}</div>
          <div class="post-card-excerpt">${meta.body || ""}</div>
          <div class="post-card-date"><i class="fas fa-calendar-alt" style="margin-right:5px;opacity:0.6;"></i>${meta.date || ""}</div>
        </div>
      `;
      card.addEventListener("click", () => window.location.href = `post.html?slug=${encodeURIComponent(slug)}`);
      postsGrid.appendChild(card);
    }
  })
  .catch(() => {
    postsGrid.innerHTML = "<p style='text-align:center;opacity:0.6;'>Posts load nahi ho sake.</p>";
  });
