if (document.readyState === "loading") {
  console.log("bundle-cart init (loading)");
  document.addEventListener("DOMContentLoaded", initBundleCartTest);
} else {
  console.log("bundle-cart init (ready)");
  initBundleCartTest();
}

function initBundleCartTest() {
  try {
    enhanceCartPrices();

    // 处理抽屉购物车等动态插入的 DOM
    const observer = new MutationObserver(() => {
      enhanceCartPrices();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  } catch (e) {
    console.error("bundle cart ywtest init error", e);
  }
}

function enhanceCartPrices() {
  try {
    const candidates = [
      '[data-cart-subtotal]',
      '[data-cart-total]',
      '.totals__subtotal-value',
      '.cart__subtotal',
      '.cart__price',
      '.cart__price-amount',
      '.cart-item__price',
      '.cart__footer .price',
      '.cart-items .price'
    ];

    for (const selector of candidates) {
      const nodes = document.querySelectorAll(selector);
      if (!nodes.length) continue;

      nodes.forEach((el) => {
        if (el.querySelector('[data-bundle-ywtest="true"]')) return;

        const span = document.createElement("span");
        span.textContent = " ywtest";
        span.style.marginLeft = "4px";
        span.style.color = "red";
        span.style.fontWeight = "600";
        span.setAttribute("data-bundle-ywtest", "true");

        el.appendChild(span);
      });
    }
  } catch (e) {
    console.error("bundle cart ywtest enhance error", e);
  }
}

