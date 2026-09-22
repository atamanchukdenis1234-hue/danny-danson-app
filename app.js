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

// Состояние корзины: массив { productId, size, qty }
let cart = [];

// Что выбрано на экране товара прямо сейчас
let currentProduct = null;
let selectedSize = null;
let selectedQty = 1;

// ---------- ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ ----------
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id + '-view').classList.add('active');
  window.scrollTo(0, 0);
}

// ---------- КАТАЛОГ ----------
function renderCatalog() {
  const grid = document.getElementById('catalog-grid');
  grid.innerHTML = '';
  PRODUCTS.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${p.images[0]}" alt="${p.name}">
      <div class="p-name">${p.name}</div>
      <div class="p-price">${p.price} ₽</div>
    `;
    card.addEventListener('click', () => openProduct(p.id));
    grid.appendChild(card);
  });
}

// ---------- КАРТОЧКА ТОВАРА ----------
function openProduct(id) {
  currentProduct = PRODUCTS.find(p => p.id === id);
  selectedSize = null;
  selectedQty = 1;

  const gallery = currentProduct.images.map(img => `<img src="${img}">`).join('');
  const sizes = currentProduct.sizes.map(s =>
    `<div class="size-opt" data-size="${s}">${s}</div>`
  ).join('');

  document.getElementById('product-content').innerHTML = `
    <div class="product-gallery">${gallery}</div>
    <div class="p-title">${currentProduct.name}</div>
    <div class="p-detail-price">${currentProduct.price} ₽</div>
    <div class="p-desc">${currentProduct.description}</div>

    <span class="option-label">Размер</span>
    <div class="size-row" id="size-row">${sizes}</div>

    <span class="option-label">Количество</span>
    <div class="qty-row">
      <button class="qty-btn" id="qty-minus">−</button>
      <span class="qty-val" id="qty-val">1</span>
      <button class="qty-btn" id="qty-plus">+</button>
    </div>

    <button class="add-btn" id="add-to-cart-btn" disabled>ВЫБЕРИТЕ РАЗМЕР</button>
  `;

  // выбор размера
  document.querySelectorAll('.size-opt').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.size-opt').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      selectedSize = el.dataset.size;
      document.getElementById('add-to-cart-btn').disabled = false;
      document.getElementById('add-to-cart-btn').textContent = 'ДОБАВИТЬ В КОРЗИНУ';
    });
  });

  // количество
  document.getElementById('qty-minus').addEventListener('click', () => {
    if (selectedQty > 1) selectedQty--;
    document.getElementById('qty-val').textContent = selectedQty;
  });
  document.getElementById('qty-plus').addEventListener('click', () => {
    selectedQty++;
    document.getElementById('qty-val').textContent = selectedQty;
  });

  // добавить в корзину
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
  updateCartCount();
}

function updateCartCount() {
  const total = cart.reduce((sum, i) => sum + i.qty, 0);
  document.getElementById('cart-count').textContent = total;
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
      <img src="${product.images[0]}">
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
      updateCartCount();
      renderCart();
    });
  });
  document.querySelectorAll('.cart-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = btn.dataset.index;
      if (cart[i].qty > 1) cart[i].qty--;
      else cart.splice(i, 1);
      updateCartCount();
      renderCart();
    });
  });
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cart.splice(btn.dataset.index, 1);
      updateCartCount();
      renderCart();
    });
  });
  document.getElementById('checkout-btn').addEventListener('click', () => {
    showView('checkout');
  });
}

// ---------- ОФОРМЛЕНИЕ ЗАКАЗА ----------
document.getElementById('checkout-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('f-name').value;
  const phone = document.getElementById('f-phone').value;
  const city = document.getElementById('f-city').value;
  const comment = document.getElementById('f-comment').value;

  const items = cart.map(item => {
    const product = PRODUCTS.find(p => p.id === item.productId);
    return `${product.name} (${item.size}) x${item.qty} — ${product.price * item.qty}₽`;
  });
  const total = cart.reduce((sum, item) => {
    const product = PRODUCTS.find(p => p.id === item.productId);
    return sum + product.price * item.qty;
  }, 0);

  const orderData = { name, phone, city, comment, items, total };

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

// ---------- СТАРТ ----------
renderCatalog();
