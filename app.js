// ============================================================
// ЛОГИКА ПРИЛОЖЕНИЯ
// Тут ничего редактировать не нужно — только если захочешь
// поменять поведение. Товары меняются в products.js
// ============================================================

// Если открыто внутри Telegram — сразу разворачиваем на весь экран
if (window.Telegram && window.Telegram.WebApp) {
  Telegram.WebApp.ready();
  Telegram.WebApp.expand();
}

// Плавное появление картинок после загрузки
document.addEventListener('load', (e) => {
  if (e.target.tagName === 'IMG') e.target.classList.add('loaded');
}, true);

// Состояние корзины: массив { productId, size, qty }
let cart = loadCart();

function loadCart() {
  try {
    const raw = localStorage.getItem('dd_cart');
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    // Фильтруем битые записи, а также товары, которых уже нет в products.js
    return data.filter(i =>
      i && typeof i.productId !== 'undefined' &&
      typeof i.qty === 'number' && i.qty > 0 &&
      PRODUCTS.some(p => p.id === i.productId)
    );
  } catch (e) {
    console.log('Не смогли прочитать корзину:', e);
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem('dd_cart', JSON.stringify(cart));
  } catch (e) {
    console.log('Не смогли сохранить корзину:', e);
  }
}

// Что выбрано на экране товара прямо сейчас
let currentProduct = null;
let selectedSize = null;
let selectedQty = 1;

// ---------- НАСТРОЙКИ ФОТО ----------
const IMG_DEFAULTS = { fit: 'cover', ratio: '4/5', position: 'center center' };

function getImageSettings(product) {
  const base = (typeof IMAGE_SETTINGS !== 'undefined') ? IMAGE_SETTINGS : IMG_DEFAULTS;
  return {
    fit:      (product && product.imageFit)      || base.fit      || IMG_DEFAULTS.fit,
    ratio:    (product && product.imageRatio)    || base.ratio    || IMG_DEFAULTS.ratio,
    position: (product && product.imagePosition) || base.position || IMG_DEFAULTS.position
  };
}

function imageStyleFor(product) {
  const s = getImageSettings(product);
  return `object-fit:${s.fit};object-position:${s.position};aspect-ratio:${s.ratio};`;
}

// ---------- ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ ----------
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id + '-view').classList.add('active');
  window.scrollTo(0, 0);
  updateTelegramBackButton(id);
}

// ---------- КАТАЛОГ ----------
function renderCatalog() {
  const grid = document.getElementById('catalog-grid');
  grid.innerHTML = '';
  PRODUCTS.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${p.images[0]}" alt="${p.name}" loading="lazy" style="${imageStyleFor(p)}">
      <div class="p-name">${p.name}</div>
      <div class="p-price">${p.price} ₽</div>
    `;
    card.addEventListener('click', () => openProduct(p.id));
    grid.appendChild(card);
  });
}

function renderAdvantages(product) {
  if (!Array.isArray(product.advantages) || product.advantages.length === 0) return '';
  return `
    <div class="p-block">
      <div class="p-block-title">Преимущества</div>
      <ul class="p-bullets">
        ${product.advantages.map(a => `<li>${a}</li>`).join('')}
      </ul>
    </div>
  `;
}

function renderSpecs(product) {
  if (!product.specs || typeof product.specs !== 'object') return '';
  const entries = Object.entries(product.specs);
  if (entries.length === 0) return '';
  return `
    <div class="p-block">
      <div class="p-block-title">Характеристики</div>
      <div class="p-specs">
        ${entries.map(([k, v]) =>
          `<div class="p-spec-row"><span class="p-spec-key">${k}</span><span class="p-spec-val">${v}</span></div>`
        ).join('')}
      </div>
    </div>
  `;
}
// ---------- КАРТОЧКА ТОВАРА ----------
function openProduct(id) {
  currentProduct = PRODUCTS.find(p => p.id === id);
  selectedSize = null;
  selectedQty = 1;

  const imgStyle = imageStyleFor(currentProduct);
  const gallery = currentProduct.images
    .map(img => `<img src="${img}" alt="${currentProduct.name}" style="${imgStyle}">`)
    .join('');
  const sizes = currentProduct.sizes
    .map(s => `<div class="size-opt" data-size="${s}">${s}</div>`)
    .join('');

  document.getElementById('product-content').innerHTML = `
    <div class="product-gallery">${gallery}</div>
    <div class="p-title">${currentProduct.name}</div>
    <div class="p-detail-price">${currentProduct.price} ₽</div>
    <div class="p-desc">${currentProduct.description}</div>

    ${renderAdvantages(currentProduct)}
    ${renderSpecs(currentProduct)}

    <span class="option-label">Размер</span>
    <div class="size-row" id="size-row">${sizes}</div>

    <span class="option-label">Количество</span>
    <div class="qty-row">
      <button class="qty-btn" id="qty-minus">−</button>
      <span class="qty-val" id="qty-val">1</span>
      <button class="qty-btn" id="qty-plus">+</button>
    </div>

    <div class="p-total" id="p-total">Итого: ${currentProduct.price} ₽</div>

    <button class="add-btn" id="add-to-cart-btn" disabled>ВЫБЕРИТЕ РАЗМЕР</button>
  `;

  function updateProductTotal() {
    const total = currentProduct.price * selectedQty;
    document.getElementById('p-total').textContent = `Итого: ${total} ₽`;
  }

  document.querySelectorAll('.size-opt').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.size-opt').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      selectedSize = el.dataset.size;
      document.getElementById('add-to-cart-btn').disabled = false;
      document.getElementById('add-to-cart-btn').textContent = 'ДОБАВИТЬ В КОРЗИНУ';
    });
  });

  document.getElementById('qty-minus').addEventListener('click', () => {
    if (selectedQty > 1) selectedQty--;
    document.getElementById('qty-val').textContent = selectedQty;
    updateProductTotal();
  });
  document.getElementById('qty-plus').addEventListener('click', () => {
    selectedQty++;
    document.getElementById('qty-val').textContent = selectedQty;
    updateProductTotal();
  });

  document.getElementById('add-to-cart-btn').addEventListener('click', () => {
    addToCart(currentProduct.id, selectedSize, selectedQty);
    showView('catalog');
  });

  showView('product');
}

// ---------- КОРЗИНА: ДАННЫЕ ----------
function addToCart(productId, size, qty) {
  const existing = cart.find(i => i.productId === productId && i.size === size);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ productId, size, qty });
  }
  saveCart();
  updateCartCount();
}

function updateCartCount() {
  const total = cart.reduce((sum, i) => sum + i.qty, 0);
  const badge = document.getElementById('cart-count');
  badge.textContent = total;
  badge.hidden = total === 0;
}

// ---------- КОРЗИНА: ЭКРАН ----------
function renderCart() {
  const container = document.getElementById('cart-items');
  const summary = document.getElementById('cart-summary');

  if (cart.length === 0) {
    container.innerHTML = '<div class="empty-note">Корзина пуста</div>';
    summary.innerHTML = '';
    return;
  }

  container.innerHTML = '';
  let total = 0;

  cart.forEach((item, index) => {
    const product = PRODUCTS.find(p => p.id === item.productId);
    const lineTotal = product.price * item.qty;
    total += lineTotal;

    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <img src="${product.images[0]}" alt="${product.name}" style="${imageStyleFor(product)}">
      <div class="cart-item-info">
        <div class="cart-item-name">${product.name}</div>
        <div class="cart-item-meta">Размер: ${item.size} · ${product.price} ₽</div>
        <div class="cart-item-controls">
          <button class="qty-btn cart-minus" data-index="${index}">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn cart-plus" data-index="${index}">+</button>
          <button class="remove-btn" data-index="${index}">Удалить</button>
        </div>
      </div>
    `;
    container.appendChild(row);
  });

  summary.innerHTML = `
    <div class="cart-total-row"><span>Итого</span><span>${total} ₽</span></div>
    <button class="submit-btn" id="checkout-btn">ОФОРМИТЬ ЗАКАЗ</button>
  `;

  // кнопки +/- и удалить
  document.querySelectorAll('.cart-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      cart[btn.dataset.index].qty++;
      saveCart();
      updateCartCount();
      renderCart();
    });
  });
  document.querySelectorAll('.cart-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = btn.dataset.index;
      if (cart[i].qty > 1) cart[i].qty--;
      else cart.splice(i, 1);
      saveCart();
      updateCartCount();
      renderCart();
    });
  });
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cart.splice(btn.dataset.index, 1);
      saveCart();
      updateCartCount();
      renderCart();
    });
  });
  document.getElementById('checkout-btn').addEventListener('click', () => {
    showView('checkout');
  });
}

// ---------- ОФОРМЛЕНИЕ ЗАКАЗА ----------
const FIELDS = {
  fio: {
    el: 'f-fio',
    validate: v => v.trim().split(/\s+/).filter(w => w.length >= 2).length >= 2
      ? null : 'Укажи хотя бы фамилию и имя'
  },
  tgnick: {
    el: 'f-tgnick',
    validate: v => v.trim().length >= 2 ? null : 'Укажи ник в Telegram'
  },
  phone: {
    el: 'f-phone',
    validate: v => v.replace(/\D/g, '').length === 11
      ? null : 'Телефон должен содержать 11 цифр (+7 и ещё 10)'
  },
  city: {
    el: 'f-city',
    validate: v => v.trim().length >= 2 ? null : 'Укажи город'
  },
  pvz: {
    el: 'f-pvz',
    validate: v => v.trim().length >= 5 ? null : 'Укажи адрес пункта выдачи'
  }
};

function clearError(key) {
  const el = document.getElementById(FIELDS[key].el);
  el.classList.remove('input-error');
  const err = el.parentElement.querySelector('.field-error');
  if (err) err.remove();
}

function showError(key, msg) {
  const el = document.getElementById(FIELDS[key].el);
  el.classList.add('input-error');
  const err = document.createElement('span');
  err.className = 'field-error';
  err.textContent = msg;
  el.parentElement.appendChild(err);
}

function validateForm() {
  let ok = true;
  let firstBad = null;
  for (const key of Object.keys(FIELDS)) {
    clearError(key);
    const el = document.getElementById(FIELDS[key].el);
    const msg = FIELDS[key].validate(el.value);
    if (msg) {
      showError(key, msg);
      ok = false;
      if (!firstBad) firstBad = el;
    }
  }
  if (firstBad) firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return ok;
}

// Ошибки убираются, как только юзер начинает править поле
Object.values(FIELDS).forEach(f => {
  const el = document.getElementById(f.el);
  el.addEventListener('input', () => {
    el.classList.remove('input-error');
    const err = el.parentElement.querySelector('.field-error');
    if (err) err.remove();
  });
});

// ---------- МАСКА ТЕЛЕФОНА ----------
function formatPhone(raw) {
  let d = raw.replace(/\D/g, '');
  if (!d) return '';
  if (d[0] === '8') d = '7' + d.slice(1);
  if (d[0] !== '7') d = '7' + d;
  d = d.slice(0, 11);
  const p = d.slice(1);
  let out = '+7';
  if (p.length) out += ' (' + p.slice(0, 3);
  if (p.length >= 3) out += ')';
  if (p.length > 3) out += ' ' + p.slice(3, 6);
  if (p.length > 6) out += '-' + p.slice(6, 8);
  if (p.length > 8) out += '-' + p.slice(8, 10);
  return out;
}

document.getElementById('f-phone').addEventListener('input', (e) => {
  e.target.value = formatPhone(e.target.value);
});

// ---------- АВТОЗАПОЛНЕНИЕ НИКА ИЗ TELEGRAM ----------
function autofillNickFromTelegram() {
  if (!window.Telegram || !Telegram.WebApp || !Telegram.WebApp.initDataUnsafe) return;
  const u = Telegram.WebApp.initDataUnsafe.user;
  if (!u) return;

  const nickEl = document.getElementById('f-tgnick');
  const hint = document.getElementById('hint-tgnick');

  if (nickEl.value) return;

  if (u.username) {
    nickEl.value = '@' + u.username;
    nickEl.classList.add('input-autofilled');
    hint.hidden = false;
  }

  nickEl.addEventListener('input', () => {
    nickEl.classList.remove('input-autofilled');
    hint.hidden = true;
  });
}

// ---------- АВТО-@ ДЛЯ НИКА ----------
const nickEl = document.getElementById('f-tgnick');
nickEl.addEventListener('blur', () => {
  const v = nickEl.value.trim();
  if (!v) return;
  // Если уже есть @, или это телефон/id — не трогаем
  if (v.startsWith('@') || /^[+0-9]/.test(v)) return;
  nickEl.value = '@' + v;
});

// ---------- ОТПРАВКА ФОРМЫ ----------
document.getElementById('checkout-form').addEventListener('submit', (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  const fio = document.getElementById('f-fio').value.trim();
  const tgnick = document.getElementById('f-tgnick').value.trim();
  const phone = document.getElementById('f-phone').value.trim();
  const city = document.getElementById('f-city').value.trim();
  const pvz = document.getElementById('f-pvz').value.trim();
  const comment = document.getElementById('f-comment').value.trim();

  const items = cart.map(item => {
    const product = PRODUCTS.find(p => p.id === item.productId);
    return `${product.name} (${item.size}) x${item.qty} — ${product.price * item.qty}₽`;
  });
  const total = cart.reduce((sum, item) => {
    const product = PRODUCTS.find(p => p.id === item.productId);
    return sum + product.price * item.qty;
  }, 0);

  const orderData = { fio, tgnick, phone, city, pvz, comment, items, total };

  // Если открыто в Telegram — отправляем данные боту.
  // (Приём заказа ботом настроим отдельным шагом позже.)
  if (window.Telegram && window.Telegram.WebApp && Telegram.WebApp.sendData) {
    try {
      Telegram.WebApp.sendData(JSON.stringify(orderData));
    } catch (err) {
      console.log('Telegram sendData недоступен:', err);
    }
  } else {
    // Режим тестирования в обычном браузере — просто показываем заказ
    console.log('ЗАКАЗ (тест вне Telegram):', orderData);
  }

  cart = [];
  saveCart();
  updateCartCount();
  document.getElementById('checkout-form').reset();
  showView('done');
});
// ---------- НАВИГАЦИЯ ----------
document.getElementById('cart-btn').addEventListener('click', () => {
  renderCart();
  showView('cart');
});

document.querySelectorAll('[data-back]').forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.back));
});

// ---------- КНОПКА НАЗАД В TELEGRAM ----------
const BACK_MAP = {
  'product':  'catalog',
  'cart':     'catalog',
  'checkout': 'cart',
  'done':     'catalog'
};

function tgBackButtonAvailable() {
  if (!window.Telegram || !Telegram.WebApp) return false;
  if (!Telegram.WebApp.BackButton) return false;
  // BackButton появился в версии 6.1 — на 6.0 методов show/hide нет
  const v = parseFloat(Telegram.WebApp.version || '0');
  if (v < 6.1) return false;
  return typeof Telegram.WebApp.BackButton.show === 'function'
      && typeof Telegram.WebApp.BackButton.hide === 'function';
}

function updateTelegramBackButton(viewId) {
  if (!tgBackButtonAvailable()) return;
  const bb = Telegram.WebApp.BackButton;
  if (viewId === 'catalog') bb.hide();
  else bb.show();
}

function initTelegramBackButton() {
  if (!tgBackButtonAvailable()) return;
  const bb = Telegram.WebApp.BackButton;
  bb.hide();
  bb.onClick(() => {
    const active = document.querySelector('.view.active');
    if (!active) return;
    const id = active.id.replace('-view', '');
    const back = BACK_MAP[id] || 'catalog';
    if (back === 'cart') renderCart();
    showView(back);
  });
}

// ---------- СТАРТ ----------
renderCatalog();
if (typeof autofillNickFromTelegram === 'function') autofillNickFromTelegram();
updateCartCount();
initTelegramBackButton();