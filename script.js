const phoneNumber = window.acharyaConfig?.phone || "+918218433649";
const whatsappNumber = window.acharyaConfig?.whatsapp || "918218433649";
const acharyaImage = window.acharyaConfig?.acharyaImage || "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=880&q=80";

// Load acharya image from config
const acharyaImgElement = document.getElementById("acharyaImage");
if (acharyaImgElement) {
  acharyaImgElement.src = acharyaImage;
}

const services = [
  { title: "Astrology Consultation", icon: "fas fa-chart-line", description: "Precise astrology readings for life, relationships, career, marriage, and destiny. Personalized guidance based on your birth chart.", price: "Price: Call for Details" },
  { title: "Janampatri Making", icon: "fas fa-scroll", description: "Authentic birth chart (Kundli) creation with detailed life predictions, planetary analysis, and remedial suggestions.", price: "Price: Call for Details" },
  { title: "Vastu Consultation - Home Visit", icon: "fas fa-home", description: "Professional in-person vastu inspection and customized solutions for your home's energy and prosperity.", price: "Price: Call for Details" },
  { title: "Vastu Consultation - Online", icon: "fas fa-video", description: "Remote vastu guidance through video consultation for home, office, or business from anywhere.", price: "Price: Call for Details" },
  { title: "Learn Astrology & Vastu", icon: "fas fa-book-open", description: "Educational sessions to learn the basics of Vedic Astrology and Vastu Shastra at your own pace.", price: "Price: Call for Details" },
];

const servicesGrid = document.getElementById("servicesGrid");

services.forEach((service, index) => {
  const card = document.createElement("article");
  card.className = "services-card glass-card animate-up";
  if (index % 3 === 1) card.classList.add("delay-1");
  if (index % 3 === 2) card.classList.add("delay-2");
  card.innerHTML = `
    <div class="service-icon"><i class="${service.icon}"></i></div>
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
  if (e.key === "Escape") closeLightbox();
});
