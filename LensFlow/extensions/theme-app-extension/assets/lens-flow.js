(function() {
"use strict";

// 内联 SVG 占位图：当主题取不到产品主图、或绑定的镜片产品没图时使用，避免破图标
var LF_PLACEHOLDER_IMG = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" width="120" height="80">' +
  '<rect width="120" height="80" rx="6" fill="#f5f6f8"/>' +
  '<g fill="none" stroke="#c9ced6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<circle cx="40" cy="44" r="14"/>' +
  '<circle cx="80" cy="44" r="14"/>' +
  '<path d="M54 44h12"/><path d="M26 36l-8 4"/><path d="M94 36l8 4"/>' +
  '</g>' +
  '<text x="60" y="72" text-anchor="middle" font-family="system-ui,Arial,sans-serif" font-size="9" fill="#9aa1aa">No image</text>' +
  '</svg>'
);

window.LensFlow = {
  PLACEHOLDER_IMG: LF_PLACEHOLDER_IMG,

  init: function(config) {
    this.config = config;
    this.currentStep = 0;
    this.flow = null;
    this.lensDecisions = null;
    this.selections = {};
    this.prescriptionId = null;
    this.bundleId = null;
    this.uploadedFile = null;
    this.lensVariants = {};
    this.cachedProductImages = [];
    this.themeInfo = null;

    this.detectTheme();
    this.cacheProductImages();
    this.prefetchFlowConfig();
  },

  detectTheme: function() {
    var info = { name: 'unknown', isDawn: false, hasCartDrawer: false, cartDrawerSelector: null };
    if (window.customElements && window.customElements.get('cart-drawer')) {
      info.name = 'dawn';
      info.isDawn = true;
      info.hasCartDrawer = true;
      info.cartDrawerSelector = 'cart-drawer';
    } else if (window.customElements && window.customElements.get('cart-items')) {
      info.name = 'dawn-variant';
      info.isDawn = true;
      info.hasCartDrawer = true;
      info.cartDrawerSelector = 'cart-drawer';
    } else if (document.querySelector('cart-drawer')) {
      info.name = 'dawn-detected';
      info.isDawn = true;
      info.hasCartDrawer = true;
      info.cartDrawerSelector = 'cart-drawer';
    } else if (document.querySelector('[id*="CartDrawer"]') || document.querySelector('[class*="cart-drawer"]')) {
      info.hasCartDrawer = true;
      info.cartDrawerSelector = '[id*="CartDrawer"], [class*="cart-drawer"]';
    }
    this.themeInfo = info;
  },

  cacheProductImages: function() {
    var self = this;
    var images = document.querySelectorAll('.product__media img, [data-media-type="image"] img, .product-single__media img, .product-featured-img, .product__featured-image');
    self.cachedProductImages = [];
    images.forEach(function(img) {
      var src = img.src || img.getAttribute('data-src') || img.getAttribute('data-srcset');
      if (src) {
        self.cachedProductImages.push(src.split('?')[0].split(',')[0].trim());
      }
    });
    if (self.cachedProductImages.length === 0) {
      var metaImg = document.querySelector('meta[property="og:image"]');
      if (metaImg) {
        self.cachedProductImages.push(metaImg.getAttribute('content'));
      }
    }
    // 兜底：仍未抓到任何图，用内联 SVG 占位，避免 <img src=""> 破图
    if (self.cachedProductImages.length === 0) {
      self.cachedProductImages.push(LF_PLACEHOLDER_IMG);
    }
  },

  getSettings: function() {
    var cfg = this.prefetchedConfig;
    if (cfg && cfg.flow && cfg.flow.config && cfg.flow.config.settings) {
      return cfg.flow.config.settings;
    }
    return {};
  },

  prefetchFlowConfig: function() {
    var self = this;
    var proxyPath = (this.config.proxyUrl || '').replace(/\/+$/, '');
    var url = proxyPath + '/api/products/' + this.config.productId + '/flow';
    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        self.prefetchedConfig = data;
        self.injectButton();
        self.updateButtonVisibility();
        var settings = self.getSettings();
        if (settings.displayMode === 'always') {
          setTimeout(function() { self.openFlow(); }, 500);
        }
        if (settings.displayMode === 'variant') {
          self.listenForVariantChanges();
        }
      })
      .catch(function() {
        self.injectButton();
        self.updateButtonVisibility();
      });
  },

  updateButtonVisibility: function() {
    var btn = document.getElementById('lensflow-select-btn');
    if (!btn) return;
    var cfg = this.prefetchedConfig;
    if (!cfg || !cfg.published || !cfg.flow) {
      btn.style.display = '';
      this.buttonVisible = true;
      return;
    }
    var settings = this.getSettings();
    var displayMode = settings.displayMode || 'always';
    if (displayMode === 'always') {
      btn.style.display = '';
      this.buttonVisible = true;
    } else if (displayMode === 'variant') {
      var currentVariant = this.getCurrentVariantId();
      if (settings.variantId && currentVariant === settings.variantId) {
        btn.style.display = '';
        this.buttonVisible = true;
      } else {
        btn.style.display = 'none';
        this.buttonVisible = false;
      }
    } else if (displayMode === 'tag') {
      if (settings.tag && this.config.tags && this.config.tags.indexOf(settings.tag) >= 0) {
        btn.style.display = '';
        this.buttonVisible = true;
      } else {
        btn.style.display = 'none';
        this.buttonVisible = false;
      }
    } else if (displayMode === 'collection') {
      if (settings.collectionId && this.config.collectionIds && this.config.collectionIds.indexOf(settings.collectionId) >= 0) {
        btn.style.display = '';
        this.buttonVisible = true;
      } else {
        btn.style.display = 'none';
        this.buttonVisible = false;
      }
    }
  },

  listenForVariantChanges: function() {
    var self = this;
    var select = document.querySelector('select[name="id"]');
    if (select) {
      select.addEventListener('change', function() { self.updateButtonVisibility(); });
    }
    var radios = document.querySelectorAll('input[name="id"]');
    for (var i = 0; i < radios.length; i++) {
      radios[i].addEventListener('change', function() { self.updateButtonVisibility(); });
    }
  },

  getButtonMode: function() {
    var settings = this.getSettings();
    return settings.buttonMode || 'append';
  },

  getLayoutMode: function() {
    var settings = this.getSettings();
    return settings.layoutMode || 'modal';
  },

  getButtonText: function() {
    var settings = this.getSettings();
    return settings.buttonText || 'Select Lenses';
  },

  injectButton: function() {
    var self = this;
    var buttonMode = this.getButtonMode();
    var buttonText = this.getButtonText();
    var addToCart = document.querySelector('[data-testid="AddToCart"]') ||
                    document.querySelector('button[name="add"]') ||
                    document.querySelector('[type="submit"]');

    var parent = addToCart ? addToCart.parentElement : document.querySelector('.product-form__buttons');
    if (!parent) return;

    if (buttonMode === 'replace') {
      if (addToCart) {
        addToCart.style.display = 'none';
        this.originalAddToCart = addToCart;
        this.originalAddToCartDisplay = addToCart.style.display;
      }
    }

    var existingBtn = document.getElementById('lensflow-select-btn');
    if (existingBtn) existingBtn.remove();

    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "lensflow-select-btn";
    btn.innerHTML = '<span>&#x1f453;</span> ' + buttonText;
    btn.onclick = function(e) {
      e.preventDefault();
      self.openFlow();
    };
    if (buttonMode === 'replace') {
      btn.className = 'lf-btn-replace';
    }
    parent.insertBefore(btn, buttonMode === 'replace' ? parent.firstChild : addToCart);
  },

  openFlow: function() {
    var self = this;
    this.showLoading();
    var proxyPath = (this.config.proxyUrl || "").replace(/\/+$/, "");

    // 第一步:查询该产品有哪些已发布的 Flow,如果多于 1 个,先让顾客选择
    var listUrl = proxyPath + "/api/products/" + this.config.productId + "/flows";
    fetch(listUrl)
      .then(function(r) { return r.json(); })
      .then(function(listData) {
        var flows = (listData && listData.flows) || [];
        if (flows.length > 1) {
          self.renderContainer();
          self.renderFlowChooser(flows);
          return;
        }
        // 只有一个或没有,直接加载该 Flow
        self.loadFlow(flows[0] ? flows[0].id : null);
      })
      .catch(function() {
        // 列表接口失败 → 退化为旧逻辑
        self.loadFlow(null);
      });
  },

  loadFlow: function(flowId) {
    var self = this;
    this.showLoading();
    var proxyPath = (this.config.proxyUrl || "").replace(/\/+$/, "");
    var url = proxyPath + "/api/products/" + this.config.productId + "/flow";
    if (flowId) url += "?flowId=" + encodeURIComponent(flowId);

    fetch(url)
      .then(function(r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function(data) {
        if (!data || !data.published || !data.flow) {
          self.showError("No published flow for this product");
          return;
        }
        self.flow = data.flow;
        self.selectedFlowId = flowId || (data.flow && data.flow.id) || null;
        self.lensDecisions = data.lensDecisions || [];
        self.currentStep = 0;
        self.selections = {};
        self.lensVariants = {};
        self.renderContainer();
        self.renderStep();
      })
      .catch(function(err) {
        console.error("[LensFlow] loadFlow failed:", err);
        self.showError("Failed to load flow configuration: " + (err && err.message || ""));
      });
  },

  renderFlowChooser: function(flows) {
    var self = this;
    var body = document.getElementById('lf-body');
    var footer = document.getElementById('lf-footer');
    var title = document.getElementById('lf-step-title');
    if (title) title.textContent = 'Choose Your Lens Plan';

    var html = '<p class="lf-step-desc">Select the lens plan that best suits you:</p>';
    html += '<div class="lf-flow-chooser">';
    flows.forEach(function(f, idx) {
      html += '<div class="lf-lens-card" style="cursor:pointer" onclick="window.LensFlow.loadFlow(\'' + f.id + '\')">' +
                '<div class="lf-lens-card-body">' +
                  '<div class="lf-lens-card-title">' + (f.name || ('Plan ' + (idx + 1))) + '</div>' +
                  (f.description ? '<div class="lf-lens-card-desc">' + f.description + '</div>' : '') +
                  (f.type ? '<div class="lf-lens-card-features"><span class="lf-lens-card-feature">' + f.type + '</span></div>' : '') +
                '</div>' +
              '</div>';
    });
    html += '</div>';
    if (body) body.innerHTML = html;
    if (footer) footer.innerHTML = '';
  },

  closeModal: function() {
    var el = document.querySelector(".lf-overlay, .lf-drawer-overlay, .lf-inline-wrapper");
    if (el) el.remove();
    document.body.classList.remove('lf-inline-open');
    if (this.originalAddToCart) {
      this.originalAddToCart.style.display = this.originalAddToCartDisplay || '';
    }
  },

  getLayoutShellHTML: function() {
    var layout = this.getLayoutMode();
    var currentImage = this.cachedProductImages.length > 0 ? this.cachedProductImages[0] : LF_PLACEHOLDER_IMG;
    var headerHTML =
      '<div class="lf-modal-header">' +
      '  <h2 id="lf-step-title">Loading...</h2>' +
      '  <button class="lf-close-btn" onclick="window.LensFlow.closeModal()">&times;</button>' +
      '</div>';
    var progressHTML = '<div class="lf-progress" id="lf-progress"></div>';
    var bodyHTML = '<div class="lf-modal-body" id="lf-body"></div>';
    var footerHTML = '<div class="lf-modal-footer" id="lf-footer"></div>';
    var imgErr = "this.onerror=null;this.src='" + LF_PLACEHOLDER_IMG + "'";

    switch (layout) {
      case 'horizontal':
        return '<div class="lf-horizontal-container">' +
          '<div class="lf-horizontal-image-area">' +
          '  <img src="' + currentImage + '" alt="Product" id="lf-horizontal-image" class="lf-image-swap-target" onerror="' + imgErr + '">' +
          '</div>' +
          '<div class="lf-horizontal-content-area">' +
          headerHTML + progressHTML + bodyHTML + footerHTML +
          '</div>' +
          '</div>';

      case 'inline':
        return '<div class="lf-inline-container">' +
          headerHTML + progressHTML + bodyHTML + footerHTML +
          '</div>';

      case 'drawer':
        return '<div class="lf-drawer-overlay">' +
          '<div class="lf-drawer-container">' +
          '  <div class="lf-drawer-image-area">' +
          '    <img src="' + currentImage + '" alt="Product" id="lf-drawer-image" class="lf-image-swap-target" onerror="' + imgErr + '">' +
          '  </div>' +
          headerHTML + progressHTML + bodyHTML + footerHTML +
          '</div>' +
          '</div>';

      default:
        return '<div class="lf-modal">' +
          headerHTML + progressHTML + bodyHTML + footerHTML +
          '</div>';
    }
  },

  renderContainer: function() {
    this.clearOverlays();
    var layout = this.getLayoutMode();
    var overlay;

    if (layout === 'inline') {
      overlay = document.createElement("div");
      overlay.className = "lf-inline-wrapper";
      overlay.innerHTML = this.getLayoutShellHTML();
      var atcContainer = document.querySelector('.product-form__buttons, .product__info-container, .product-form');
      if (atcContainer) {
        atcContainer.parentNode.insertBefore(overlay, atcContainer.nextSibling || atcContainer);
      } else {
        document.querySelector('#lensflow-root').parentNode.appendChild(overlay);
      }
      overlay.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (layout === 'drawer') {
      overlay = document.createElement("div");
      overlay.innerHTML = this.getLayoutShellHTML();
      document.body.appendChild(overlay.firstElementChild);
      document.body.appendChild(overlay.firstElementChild);
    } else {
      overlay = document.createElement("div");
      overlay.className = "lf-overlay";
      overlay.onclick = function(e) { if (e.target === overlay) window.LensFlow.closeModal(); };
      overlay.innerHTML = this.getLayoutShellHTML();
      document.body.appendChild(overlay);
    }
  },

  switchProductImage: function(imageUrl) {
    if (!imageUrl) return;
    var targets = document.querySelectorAll('#lf-horizontal-image, #lf-drawer-image, .lf-horizontal-image-area img');
    targets.forEach(function(img) {
      img.classList.add('lf-swapping');
      setTimeout(function() {
        img.src = imageUrl;
        img.classList.remove('lf-swapping');
      }, 200);
    });
  },

  renderStep: function() {
    var node = this.flow.config.nodes[this.currentStep];
    if (!node) { this.renderComplete(); return; }

    this.renderProgress();
    this.updateTitle(node);

    var body = document.getElementById("lf-body");
    var footer = document.getElementById("lf-footer");

    switch (node.type) {
      case "prescription_type": this.renderPrescriptionTypeStep(body, footer); break;
      case "submit_method": this.renderSubmitMethodStep(body, footer, node); break;
      case "lens_step": this.renderLensStep(body, footer, node); break;
      case "upload_step": this.renderUploadStep(body, footer); break;
      case "single_vision_form": this.renderSingleVisionForm(body, footer, node); break;
      case "reading_form": this.renderReadingForm(body, footer, node); break;
      case "progressive_form": this.renderProgressiveForm(body, footer, node); break;
      case "review_order": this.renderReview(body, footer); break;
      case "custom_step": this.renderCustomStep(body, footer, node); break;
      default: this.nextStep(); break;
    }
    var skipNode = this.flow.config.nodes[this.currentStep];
    if (skipNode && skipNode.skippable) {
      var ft = document.getElementById("lf-footer");
      var skipBtn = document.createElement("button");
      skipBtn.className = "lf-btn lf-btn-secondary";
      skipBtn.textContent = "Skip";
      skipBtn.style.marginRight = "8px";
      skipBtn.onclick = function() {
        window.LensFlow.selections["skip_" + window.LensFlow.currentStep] = true;
        window.LensFlow.nextStep();
      };
      if (ft.firstChild) ft.insertBefore(skipBtn, ft.firstChild);
      else ft.appendChild(skipBtn);
    }
  },

  updateTitle: function(node) {
    var titles = {
      prescription_type: "Select Prescription Type",
      submit_method: "Choose Your Submission Method",
      lens_step: node.label || "Choose Your Lenses",
      upload_step: "Upload Your Prescription",
      single_vision_form: "Single Vision Prescription",
      reading_form: "Reading Prescription Details",
      progressive_form: "Progressive Lens Details",
      review_order: "Review Your Order",
      custom_step: node.label || node.name || "Custom Step"
    };
    document.getElementById("lf-step-title").textContent = titles[node.type] || "Step";
  },

  renderProgress: function() {
    var total = this.flow.config.nodes.length;
    var dots = document.getElementById("lf-progress");
    if (!dots) return;
    var html = "";
    for (var i = 0; i < total; i++) {
      var cls = "lf-progress-dot";
      if (i < this.currentStep) cls += " done";
      else if (i === this.currentStep) cls += " active";
      html += '<div class="' + cls + '"></div>';
    }
    dots.innerHTML = html;
  },

  renderPrescriptionTypeStep: function(body, footer) {
    var self = this;
    var rxNode = (this.flow.config.nodes || []).find(function(n) { return n.type === "prescription_type"; });
    var types = (rxNode && rxNode.options && rxNode.options.length > 0)
      ? rxNode.options.filter(function(o) { return o.enabled !== false; }).sort(function(a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); }).map(function(o) { return { id: o.type || o.key, label: o.name || o.type || o.key, desc: o.description || "" }; })
      : [];
    var html = '<p class="lf-step-desc">Tell us what kind of prescription you need:</p>';
    types.forEach(function(t) {
      html += '<div class="lf-option" onclick="window.LensFlow.selectPrescriptionType(\'' + t.id + '\')"><div class="radio"></div><div class="info"><div class="title">' + t.label + '</div><div class="price">' + t.desc + '</div></div></div>';
    });
    body.innerHTML = html;
    footer.innerHTML = '<button class="lf-btn lf-btn-secondary" onclick="window.LensFlow.closeModal()">Cancel</button>';
  },

  selectPrescriptionType: function(type) {
    this.selections.prescriptionType = type;
    var rxNode = (this.flow.config.nodes || []).find(function(n) { return n.type === "prescription_type"; });
    var opt = (rxNode && rxNode.options) ? rxNode.options.find(function(o) { return (o.type || o.key) === type; }) : null;
    if (opt && opt.leadsTo) {
      var targetIdx = (this.flow.config.nodes || []).findIndex(function(n) { return n.ref === opt.leadsTo; });
      if (targetIdx >= 0) { this.currentStep = targetIdx; this.renderStep(); return; }
    }
    this.nextStep();
  },

  renderSubmitMethodStep: function(body, footer, node) {
    var self = this;
    var opts = (node && Array.isArray(node.options) && node.options.length > 0)
      ? node.options.filter(function(o) { return o.enabled !== false; })
      : [
        { type: "manual", name: "Enter Manually", description: "Type in your prescription values" },
        { type: "upload", name: "Upload Prescription", description: "Upload an image or PDF" },
        { type: "later", name: "Send Later", description: "We will contact you for prescription" },
      ];
    var html = '<p class="lf-step-desc">How would you like to provide your prescription?</p>';
    opts.forEach(function(o) {
      var v = o.type || o.value || o.key || o.id || "";
      var label = (o.name || o.label || v).replace(/'/g, "\\'");
      var desc = (o.description || "").replace(/'/g, "\\'");
      html += '<div class="lf-option" onclick="window.LensFlow.selectSubmitMethod(\'' + v + '\')"><div class="radio"></div><div class="info"><div class="title">' + label + '</div><div class="price">' + desc + '</div></div></div>';
    });
    body.innerHTML = html;
    footer.innerHTML = '<button class="lf-btn lf-btn-secondary" onclick="window.LensFlow.prevStep()">Back</button>';
  },

  selectSubmitMethod: function(method) {
    this.selections.submitMethod = method;
    // "later"(稍后提交):跳过表单与上传,直接进入下一个非处方相关节点
    if (method === "later") {
      this.selections.prescriptionData = {};
    }
    // Check option-level leadsTo
    var currentNode = (this.flow.config.nodes || [])[this.currentStep];
    if (currentNode && Array.isArray(currentNode.options)) {
      var opt = currentNode.options.find(function(o) { return (o.type || o.id || o.key) === method; });
      if (opt && opt.leadsTo) {
        var targetIdx = (this.flow.config.nodes || []).findIndex(function(n) { return n.ref === opt.leadsTo; });
        if (targetIdx >= 0) { this.currentStep = targetIdx; this.renderStep(); return; }
      }
    }
    this.nextStep();
  },

  renderLensStep: function(body, footer, node) {
    var self = this;
    var proxyPath = (this.config.proxyUrl || "").replace(/\/+$/, "");
    var url = proxyPath + "/api/products/" + this.config.productId + "/lens-options?prescriptionType=" + (this.selections.prescriptionType || "non_prescription") + (this.selectedFlowId ? "&flowId=" + encodeURIComponent(this.selectedFlowId) : "");

    body.innerHTML = '<div style="text-align:center;padding:40px"><div class="lf-spinner" style="border-color:var(--lf-primary);border-top-color:transparent;width:32px;height:32px"></div><p style="margin-top:12px;color:var(--lf-text2)">Loading lens options...</p></div>';
    footer.innerHTML = '';

    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var lensIds = node.lensOptionIds || [];
        var allLenses = [].concat(data.availableLensOptions || [], data.disabledLensOptions || []);  // hiddenLensOptions are ID strings only, skip
        var relevant = allLenses.filter(function(l) { return lensIds.length === 0 || lensIds.indexOf(l.id) >= 0; });
        if (relevant.length === 0) { body.innerHTML = '<p class="lf-alert lf-alert-info">No lens options match your current selection. Please go back and try a different option.</p>'; footer.innerHTML = '<button class="lf-btn lf-btn-secondary" onclick="window.LensFlow.prevStep()">Go Back</button>'; return; }

        var currentImage = self.cachedProductImages.length > 0 ? self.cachedProductImages[0] : LF_PLACEHOLDER_IMG;
        var imgErr = "this.onerror=null;this.src='" + LF_PLACEHOLDER_IMG + "'";
        var html = '';
        html += '<div class="lf-lens-preview"><img src="' + currentImage + '" alt="Product" onerror="' + imgErr + '"><div class="lf-lens-preview-info"><div class="lf-lens-preview-name">Select your lens</div><div class="lf-lens-preview-meta">Choose the lens type and options that suit your needs</div></div></div>';

        var showCards = (relevant.length > 0) && (relevant[0].imageUrl || relevant[0].description || relevant[0].features);

        relevant.forEach(function(lens, idx) {
          // Cache product info for add-to-cart (card view needs this)
          if (!self._lensProductCache) self._lensProductCache = {};
          var _firstProduct = (lens.products && lens.products.length > 0) ? lens.products[0] : null;
          self._lensProductCache[lens.id] = {
            variantId: _firstProduct ? (_firstProduct.variantId || '') : '',
            productId: _firstProduct ? (_firstProduct.productId || '') : '',
            productTitle: _firstProduct ? (_firstProduct.title || '') : ''
          };

          var disabled = lens.state === "disabled" || lens.state === "hidden";
          var cardId = 'lf-lens-card-' + idx;

          if (showCards) {
            html += '<div class="lf-lens-card' + (disabled ? ' state-disabled" title="' + (lens.messages || []).join(", ") + '"' : '"');
            if (!disabled) html += ' onclick="window.LensFlow.highlightLensCard(\'' + cardId + '\');window.LensFlow.selectLensVariant(\'' + lens.id + '\', ' + (lens.basePrice || 0) + ')"';
            html += ' id="' + cardId + '">';
            if (lens.imageUrl) html += '<img class="lf-lens-card-img" src="' + lens.imageUrl + '" alt="' + lens.name + '" onerror="this.style.display=\'none\'">';
            html += '<div class="lf-lens-card-body">';
            html += '<div class="lf-lens-card-title">' + lens.name + '</div>';
            if (lens.description) html += '<div class="lf-lens-card-desc">' + lens.description + '</div>';
            if (lens.features && lens.features.length > 0) {
              html += '<div class="lf-lens-card-features">';
              lens.features.forEach(function(f) { html += '<span class="lf-lens-card-feature">' + f + '</span>'; });
              html += '</div>';
            }
            html += '</div><div class="lf-lens-card-price">' + (lens.basePrice > 0 ? '+$' + lens.basePrice.toFixed(2) : 'Included') + '</div>';
            if (disabled) html += '<span class="state-badge state-disabled">Unavailable</span>';
            html += '</div>';

            if (!disabled && lens.variants && lens.variants.length > 0) {
              html += '<div class="lf-variant-section" id="' + cardId + '-variants" style="display:none">';
              lens.variants.forEach(function(variantGroup) {
                html += '<div class="lf-variant-section-title">' + (variantGroup.name || 'Options') + '</div>';
                if (variantGroup.type === 'swatch') {
                  html += '<div class="lf-variant-swatch-group">';
                  variantGroup.options.forEach(function(opt) {
                    var extraPrice = opt.priceAdjustment ? ' <span class="lf-variant-price">' + (opt.priceAdjustment >= 0 ? '+' : '') + '$' + Math.abs(opt.priceAdjustment).toFixed(2) + '</span>' : '';
                    html += '<div class="lf-variant-swatch" onclick="event.stopPropagation();window.LensFlow.setVariantValue(\'' + lens.id + '\', \'' + variantGroup.key + '\', \'' + opt.value + '\', ' + (opt.priceAdjustment || 0) + ')">';
                    if (opt.color) html += '<span class="swatch-color" style="background:' + opt.color + '"></span>';
                    html += opt.label + extraPrice + '</div>';
                  });
                  html += '</div>';
                } else {
                  html += '<select class="lf-variant-select" onchange="window.LensFlow.setVariantValue(\'' + lens.id + '\', \'' + variantGroup.key + '\', this.value, ' + (variantGroup.options.find(function(o){return o.priceAdjustment}) ? 'parseFloat(this.selectedOptions[0].dataset.price||0)' : '0') + ')">';
                  html += '<option value="">Select ' + (variantGroup.name || 'option') + '</option>';
                  variantGroup.options.forEach(function(opt) {
                    html += '<option value="' + opt.value + '" data-price="' + (opt.priceAdjustment || 0) + '">' + opt.label + (opt.priceAdjustment ? ' (' + (opt.priceAdjustment >= 0 ? '+' : '') + '$' + Math.abs(opt.priceAdjustment).toFixed(2) + ')' : '') + '</option>';
                  });
                  html += '</select>';
                }
              });
              html += '<button class="lf-btn lf-btn-primary lf-btn-full" style="margin-top:8px;font-size:13px;padding:8px 16px" onclick="event.stopPropagation();window.LensFlow.confirmLensVariant(\'' + lens.id + '\')">Confirm Selection</button>';
              html += '</div>';
            }
          } else {
            var products = lens.products || [];
            if (products.length === 0) {
              var extra = disabled ? ' state-disabled" title="' + (lens.messages || []).join(", ") + '"' : '"';
              html += '<div class="lf-option' + extra + (disabled ? '' : ' onclick="window.LensFlow.selectLens(\'' + lens.id + '\', ' + lens.basePrice + ', \'\', \'\')"') + '><div class="radio"></div><div class="info"><div class="title">' + lens.name + '</div>' + (lens.description ? '<div class="lf-opt-desc">' + lens.description + '</div>' : '') + (lens.imageUrl ? '<img class="lf-opt-img" src="' + lens.imageUrl + '" alt="" onerror="this.style.display=\'none\'">' : '') + '<div class="price">' + (lens.basePrice > 0 ? '+$' + lens.basePrice.toFixed(2) : 'Included') + '</div></div>' + (disabled ? '<span class="state-badge state-disabled">Unavailable</span>' : '') + '</div>';
            } else {
              html += '<div style="margin-bottom:16px"><div style="font-weight:600;font-size:15px;margin-bottom:8px;color:var(--lf-text)">' + lens.name + '</div>';
              if (lens.description) html += '<p style="font-size:12px;color:var(--lf-text2);margin-bottom:8px">' + lens.description + '</p>';
              html += '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;border-bottom:2px solid #e3e3e3"><th style="padding:6px 8px;font-weight:600">Product</th><th style="padding:6px 8px;font-weight:600;text-align:right;width:80px">Price</th><th style="width:40px"></th></tr></thead><tbody>';
              products.forEach(function(p) {
                var disabledRow = lens.state === "disabled" || lens.state === "hidden";
                var priceStr = p.price > 0 ? '+$' + p.price.toFixed(2) : (lens.basePrice > 0 ? '+$' + lens.basePrice.toFixed(2) : 'Included');
                var actualPrice = p.price > 0 ? p.price : lens.basePrice;
                html += '<tr style="border-bottom:1px solid #f0f0f0;' + (disabledRow ? 'opacity:0.5' : 'cursor:pointer') + '"' + (disabledRow ? '' : ' onclick="window.LensFlow.selectLens(\'' + lens.id + '\', ' + actualPrice + ', \'' + (p.variantId || '') + '\', \'' + (p.productId || '') + '\', \'' + (p.title || '').replace(/'/g, "\\'") + '\')"') + '><td style="padding:8px"><div style="display:flex;align-items:center;gap:10px">' + (p.imageUrl ? '<img src="' + p.imageUrl + '" style="width:40px;height:40px;object-fit:cover;border-radius:4px;border:1px solid #eee">' : '<div style="width:40px;height:40px;border-radius:4px;background:#f5f5f5"></div>') + '<div><div style="font-weight:500">' + p.title + '</div></div></div></td><td style="padding:8px;text-align:right;font-weight:500">' + priceStr + '</td><td style="padding:8px;text-align:center">' + (disabledRow ? '<span style="font-size:11px;color:#d82c0d">N/A</span>' : '▶') + '</td></tr>';
              });
              html += '</tbody></table></div>';
            }
          }
        });
        body.innerHTML = html || '<p class="lf-alert lf-alert-error">No lens options available for your selection.</p>';
      })
      .catch(function() { body.innerHTML = '<p class="lf-alert lf-alert-error">Failed to load lens options</p>'; });

    footer.innerHTML = '<button class="lf-btn lf-btn-secondary" onclick="window.LensFlow.prevStep()">Back</button>';
  },

  highlightLensCard: function(cardId) {
    var allCards = document.querySelectorAll('.lf-lens-card');
    allCards.forEach(function(c) { c.classList.remove('selected'); });
    var card = document.getElementById(cardId);
    if (card) card.classList.add('selected');
    var allVariants = document.querySelectorAll('[id$="-variants"]');
    allVariants.forEach(function(v) { v.style.display = 'none'; });
    var variantPanel = document.getElementById(cardId + '-variants');
    if (variantPanel) variantPanel.style.display = 'block';
  },

  setVariantValue: function(lensId, key, value, priceAdjustment) {
    if (!this.lensVariants[lensId]) this.lensVariants[lensId] = {};
    this.lensVariants[lensId][key] = { value: value, priceAdjustment: priceAdjustment || 0 };

    var swatches = document.querySelectorAll('.lf-variant-swatch[onclick*="' + lensId + '"][onclick*="' + key + '"]');
    swatches.forEach(function(s) { s.classList.remove('selected'); });

    if (event && event.target) {
      var clicked = event.target.closest('.lf-variant-swatch');
      if (clicked) clicked.classList.add('selected');
    }
  },

  confirmLensVariant: function(lensId) {
    var variants = this.lensVariants[lensId] || {};
    var totalAdjustment = 0;
    var selectedVariants = [];
    for (var key in variants) {
      if (variants.hasOwnProperty(key)) {
        selectedVariants.push(key + ': ' + variants[key].value);
        totalAdjustment += variants[key].priceAdjustment;
      }
    }
    this.selections.lensVariants = selectedVariants.join(', ');
    this.selectLens(lensId, totalAdjustment, '', '', '');
  },

  selectLens: function(lensId, price, variantId, productId, productTitle) {
    this.selections.lensOptionId = lensId;
    this.selections.lensPrice = price;
    this.selections.lensVariantId = variantId || "";
    this.selections.lensProductId = productId || "";
    this.selections.lensProductTitle = productTitle || "";
    // Check option-level leadsTo in lens_step pages
    var currentNode = (this.flow.config.nodes || [])[this.currentStep];
    if (currentNode && currentNode.type === 'lens_step' && Array.isArray(currentNode.pages)) {
      for (var pi = 0; pi < currentNode.pages.length; pi++) {
        var page = currentNode.pages[pi];
        if (!Array.isArray(page.options)) continue;
        var opt = page.options.find(function(o) { return o.id === lensId || o.lensOptionId === lensId; });
        if (opt && opt.leadsTo) {
          var targetIdx = (this.flow.config.nodes || []).findIndex(function(n) { return n.ref === opt.leadsTo; });
          if (targetIdx >= 0) { this.currentStep = targetIdx; this.renderStep(); return; }
        }
      }
    }
    this.nextStep();
  },

  selectLensVariant: function(lensId, basePrice) {
    // Get stored product info for this lens option
    var pinfo = (this._lensProductCache && this._lensProductCache[lensId]) || {};
    var variantId = pinfo.variantId || '';
    var productId = pinfo.productId || '';
    var productTitle = pinfo.productTitle || '';
    if (this.lensVariants[lensId] && Object.keys(this.lensVariants[lensId]).length > 0) {
      var totalAdjustment = 0;
      var selectedVariants = [];
      for (var key in this.lensVariants[lensId]) {
        if (this.lensVariants[lensId].hasOwnProperty(key)) {
          selectedVariants.push(key + ': ' + this.lensVariants[lensId][key].value);
          totalAdjustment += this.lensVariants[lensId][key].priceAdjustment;
        }
      }
      this.selections.lensVariants = selectedVariants.join(', ');
      this.selectLens(lensId, basePrice + totalAdjustment, variantId, productId, productTitle);
    } else {
      this.selectLens(lensId, basePrice, variantId, productId, productTitle);
    }
  },

  renderUploadStep: function(body, footer) {
    var self = this;
    body.innerHTML =
      '<p class="lf-step-desc">Upload a photo or scan of your prescription:</p>' +
      '<div class="lf-upload-area" id="lf-upload-area" onclick="document.getElementById(\'lf-file-input\').click()">' +
      '  <div class="lf-upload-icon">&#x1f4f7;</div>' +
      '  <div class="lf-upload-text">Click to upload or drag & drop<br><small>Accepted: JPG, PNG, PDF (max 10MB)</small></div>' +
      '  <input type="file" id="lf-file-input" accept="image/jpeg,image/png,application/pdf" style="display:none" onchange="window.LensFlow.handleFile(this)">' +
      '</div>' +
      '<div id="lf-file-preview"></div>' +
      '<div id="lf-upload-status"></div>' +
      '<p style="margin-top:16px;font-size:13px;color:var(--lf-text2);text-align:center">Or skip if you will enter details manually</p>';
    footer.innerHTML =
      '<button class="lf-btn lf-btn-secondary" onclick="window.LensFlow.prevStep()">Back</button>' +
      '<button class="lf-btn lf-btn-primary" id="lf-upload-continue" onclick="window.LensFlow.uploadPrescription()">' + (self.uploadedFile ? 'Upload & Continue' : 'Skip Upload') + '</button>';
  },

  handleFile: function(input) {
    var file = input.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("File too large (max 10MB)"); return; }
    this.uploadedFile = file;
    var preview = document.getElementById("lf-file-preview");
    preview.innerHTML = '<div class="lf-file-preview"><span>&#x1f4c4;</span><span class="name">' + file.name + ' (' + (file.size / 1024 / 1024).toFixed(1) + ' MB)</span><span class="remove" onclick="window.LensFlow.removeFile()">&times;</span></div>';
    var btn = document.getElementById("lf-upload-continue");
    if (btn) btn.textContent = "Upload & Continue";
  },

  removeFile: function() {
    this.uploadedFile = null;
    document.getElementById("lf-file-preview").innerHTML = "";
    var btn = document.getElementById("lf-upload-continue");
    if (btn) btn.textContent = "Skip Upload";
    var status = document.getElementById("lf-upload-status");
    if (status) status.innerHTML = "";
  },

  uploadPrescription: function() {
    var self = this;
    if (!self.uploadedFile) { self.nextStep(); return; }
    var btn = document.getElementById("lf-upload-continue");
    var statusEl = document.getElementById("lf-upload-status");
    btn.disabled = true;
    btn.textContent = "Uploading...";
    statusEl.innerHTML = '<p style="text-align:center;color:var(--lf-text2);margin-top:12px">Uploading prescription...</p>';
    var reader = new FileReader();
    reader.onload = function(e) {
      var base64 = e.target.result.split(",")[1];
      var proxyPath = (self.config.proxyUrl || "").replace(/\/+$/, "");
      fetch(proxyPath + "/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: self.uploadedFile.name,
          fileData: base64,
          prescriptionType: self.selections.prescriptionType || "unknown",
          notes: ""
        })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        self.prescriptionId = data.id;
        statusEl.innerHTML = '<p style="text-align:center;color:#2e7d32;margin-top:12px">&#x2705; Prescription saved (' + data.fileName + ')</p>';
        self.nextStep();
      })
      .catch(function(err) {
        statusEl.innerHTML = '<p style="text-align:center;color:#d82c0d;margin-top:12px">Upload failed, continuing anyway...</p>';
        setTimeout(function() { self.nextStep(); }, 1000);
      });
    };
    reader.onerror = function() {
      statusEl.innerHTML = '<p style="text-align:center;color:#d82c0d;margin-top:12px">Failed to read file, continuing anyway...</p>';
      setTimeout(function() { self.nextStep(); }, 1000);
    };
    reader.readAsDataURL(self.uploadedFile);
  },

  renderReadingForm: function(body, footer, node) {
    var magCfg = this.getFormConfig("maxMagnification", node);
    body.innerHTML =
      '<p class="lf-step-desc">Enter your reading prescription details:</p>' +
      '<div class="lf-form-row"><div class="lf-form-group"><label>Right SPH *</label><input id="lf-r-sph" type="number" step="0.25" min="0" max="' + (magCfg.max != null ? magCfg.max : "4") + '" placeholder="e.g. +2.00" required></div>' +
      '<div class="lf-form-group"><label>Left SPH *</label><input id="lf-l-sph" type="number" step="0.25" min="0" max="' + (magCfg.max != null ? magCfg.max : "4") + '" placeholder="e.g. +1.75" required></div></div>' +
      '<div class="lf-form-group"><label>PD' + (this.getFormConfig("pd", node).required ? ' *' : '') + '</label><input id="lf-pd" type="number" step="0.5" min="45" max="85" placeholder="e.g. 63"></div>';
    footer.innerHTML =
      '<button class="lf-btn lf-btn-secondary" onclick="window.LensFlow.prevStep()">Back</button>' +
      '<button class="lf-btn lf-btn-primary" onclick="window.LensFlow.collectReadingData()">Continue</button>';
  },

  collectReadingData: function() {
    var data = {
      od_sph: parseFloat(document.getElementById("lf-r-sph").value),
      os_sph: parseFloat(document.getElementById("lf-l-sph").value),
      pd: parseFloat(document.getElementById("lf-pd").value) || undefined
    };
    var errors = [];
    if (isNaN(data.od_sph) || data.od_sph < 0) errors.push("Right SPH must be a positive number (reading glasses use plus power).");
    if (isNaN(data.os_sph) || data.os_sph < 0) errors.push("Left SPH must be a positive number (reading glasses use plus power).");
    if (data.pd !== undefined && (data.pd < 45 || data.pd > 85)) errors.push("PD should be between 45 and 85 mm.");
    if (errors.length > 0) { this.showFormErrors(errors); return; }
    this.selections.prescriptionData = data;
    this.nextStep();
  },

  renderProgressiveForm: function(body, footer, node) {
    var sphCfg = this.getFormConfig("sph", node);
    var addCfg = this.getFormConfig("add", node);
    body.innerHTML =
      '<p class="lf-step-desc">Enter your progressive prescription details:</p>' +
      '<div class="lf-form-row"><div class="lf-form-group"><label>Right SPH' + (sphCfg.required ? ' *' : '') + '</label><input id="lf-p-r-sph" type="number" step="' + sphCfg.step + '" min="' + (sphCfg.min != null ? sphCfg.min : "") + '" max="' + (sphCfg.max != null ? sphCfg.max : "") + '" placeholder="-3.00" ' + (sphCfg.required ? 'required' : '') + '></div>' +
      '<div class="lf-form-group"><label>Left SPH' + (sphCfg.required ? ' *' : '') + '</label><input id="lf-p-l-sph" type="number" step="' + sphCfg.step + '" min="' + (sphCfg.min != null ? sphCfg.min : "") + '" max="' + (sphCfg.max != null ? sphCfg.max : "") + '" placeholder="-2.50" ' + (sphCfg.required ? 'required' : '') + '></div></div>' +
      '<div class="lf-form-row"><div class="lf-form-group"><label>Right ADD' + (addCfg.required ? ' *' : '') + '</label><input id="lf-p-r-add" type="number" step="' + addCfg.step + '" min="' + (addCfg.min != null ? addCfg.min : "0") + '" max="' + (addCfg.max != null ? addCfg.max : "4") + '" placeholder="+2.00" ' + (addCfg.required ? 'required' : '') + '></div>' +
      '<div class="lf-form-group"><label>Left ADD' + (addCfg.required ? ' *' : '') + '</label><input id="lf-p-l-add" type="number" step="' + addCfg.step + '" min="' + (addCfg.min != null ? addCfg.min : "0") + '" max="' + (addCfg.max != null ? addCfg.max : "4") + '" placeholder="+2.00" ' + (addCfg.required ? 'required' : '') + '></div></div>' +
      '<div class="lf-form-group"><label>PD' + (this.getFormConfig("pd", node).required ? ' *' : '') + '</label><input id="lf-p-pd" type="number" step="0.5" min="45" max="85" placeholder="63"></div>';
    footer.innerHTML =
      '<button class="lf-btn lf-btn-secondary" onclick="window.LensFlow.prevStep()">Back</button>' +
      '<button class="lf-btn lf-btn-primary" onclick="window.LensFlow.collectProgressiveData()">Continue</button>';
  },

  collectProgressiveData: function() {
    var node = this.flow.config.nodes[this.currentStep];
    var data = {
      od_sph: parseFloat(document.getElementById("lf-p-r-sph").value) || undefined,
      os_sph: parseFloat(document.getElementById("lf-p-l-sph").value) || undefined,
      od_add: parseFloat(document.getElementById("lf-p-r-add").value) || undefined,
      os_add: parseFloat(document.getElementById("lf-p-l-add").value) || undefined,
      pd: parseFloat(document.getElementById("lf-p-pd").value) || undefined
    };
    var errors = [];
    var sphCfg = this.getFormConfig("sph", node);
    var addCfg = this.getFormConfig("add", node);
    var pdCfg = this.getFormConfig("pd", node);
    var odSphErr = this.validateFormField(data.od_sph, sphCfg, "Right SPH");
    var osSphErr = this.validateFormField(data.os_sph, sphCfg, "Left SPH");
    var odAddErr = this.validateFormField(data.od_add, addCfg, "Right ADD");
    var osAddErr = this.validateFormField(data.os_add, addCfg, "Left ADD");
    var pdErr = this.validateFormField(data.pd, pdCfg, "PD");
    if (odSphErr) errors.push(odSphErr);
    if (osSphErr) errors.push(osSphErr);
    if (odAddErr) errors.push(odAddErr);
    if (osAddErr) errors.push(osAddErr);
    if (pdErr) errors.push(pdErr);
    errors = errors.concat(this.validateMedicalConstraints(data, node));
    if (errors.length > 0) { this.showFormErrors(errors); return; }
    this.selections.prescriptionData = data;
    this.nextStep();
  },

  getFormConfig: function(field, node) {
    if (!node || !node.config) return { min: null, max: null, step: 0.25, required: true };
    var fc = node.config[field];
    if (!fc) return { min: null, max: null, step: 0.25, required: field !== "add" };
    return { min: fc.min, max: fc.max, step: fc.step || 0.25, required: fc.required !== false };
  },

  validateFormField: function(value, fieldConfig, label) {
    if (fieldConfig.required && (value === undefined || value === null || isNaN(value))) {
      return (label || "Field") + " is required.";
    }
    if (value !== undefined && value !== null && !isNaN(value)) {
      if (fieldConfig.min !== null && fieldConfig.min !== undefined && value < fieldConfig.min) {
        return (label || "Field") + " minimum is " + fieldConfig.min + ".";
      }
      if (fieldConfig.max !== null && fieldConfig.max !== undefined && value > fieldConfig.max) {
        return (label || "Field") + " maximum is " + fieldConfig.max + ".";
      }
    }
    return null;
  },

  validateMedicalConstraints: function(data, node) {
    var errors = [];
    var odSph = data.od_sph, osSph = data.os_sph;
    var odAdd = data.od_add, osAdd = data.os_add;
    var pd = data.pd;

    if (pd !== undefined && (pd < 45 || pd > 85)) {
      errors.push("PD should be between 45 and 85 mm for a typical adult.");
    }

    if (odAdd !== undefined && osAdd !== undefined) {
      if (Math.abs(odAdd - osAdd) > 0.5) {
        errors.push("Right and left ADD values typically differ by no more than 0.50.");
      }
    }

    if (odSph !== undefined && osSph !== undefined) {
      if (Math.abs(odSph - osSph) > 4) {
        errors.push("Right and left SPH values typically differ by no more than 4.00. Please verify.");
      }
    }

    return errors;
  },

  showFormErrors: function(errors) {
    var existing = document.querySelector(".lf-form-errors");
    if (existing) existing.remove();
    if (errors.length === 0) return;
    var el = document.createElement("div");
    el.className = "lf-form-errors lf-alert lf-alert-error";
    el.innerHTML = errors.map(function(e) { return "<div>⚠ " + e + "</div>"; }).join("");
    var body = document.getElementById("lf-body");
    body.insertBefore(el, body.firstChild);
  },

  renderSingleVisionForm: function(body, footer, node) {
    var cfg = this;
    var sphCfg = cfg.getFormConfig("sph", node);
    var cylCfg = cfg.getFormConfig("cyl", node);
    var axisCfg = cfg.getFormConfig("axis", node);
    var addCfg = cfg.getFormConfig("add", node);
    var pdCfg = cfg.getFormConfig("pd", node);

    body.innerHTML =
      '<p class="lf-step-desc">Enter your single vision prescription:</p>' +
      '<div class="lf-form-row"><div class="lf-form-group"><label>Right SPH' + (sphCfg.required ? ' *' : '') + '</label><input id="lf-sv-od-sph" type="number" step="' + sphCfg.step + '" min="' + (sphCfg.min != null ? sphCfg.min : "") + '" max="' + (sphCfg.max != null ? sphCfg.max : "") + '" placeholder="e.g. -2.00" ' + (sphCfg.required ? 'required' : '') + '></div>' +
      '<div class="lf-form-group"><label>Left SPH' + (sphCfg.required ? ' *' : '') + '</label><input id="lf-sv-os-sph" type="number" step="' + sphCfg.step + '" min="' + (sphCfg.min != null ? sphCfg.min : "") + '" max="' + (sphCfg.max != null ? sphCfg.max : "") + '" placeholder="e.g. -1.75" ' + (sphCfg.required ? 'required' : '') + '></div></div>' +
      '<div class="lf-form-row"><div class="lf-form-group"><label>Right CYL' + (cylCfg.required ? ' *' : '') + '</label><input id="lf-sv-od-cyl" type="number" step="' + cylCfg.step + '" min="' + (cylCfg.min != null ? cylCfg.min : "") + '" max="' + (cylCfg.max != null ? cylCfg.max : "") + '" placeholder="e.g. -0.75" ' + (cylCfg.required ? 'required' : '') + '></div>' +
      '<div class="lf-form-group"><label>Left CYL' + (cylCfg.required ? ' *' : '') + '</label><input id="lf-sv-os-cyl" type="number" step="' + cylCfg.step + '" min="' + (cylCfg.min != null ? cylCfg.min : "") + '" max="' + (cylCfg.max != null ? cylCfg.max : "") + '" placeholder="e.g. -0.50" ' + (cylCfg.required ? 'required' : '') + '></div></div>' +
      '<div class="lf-form-row"><div class="lf-form-group"><label>Right AXIS' + (axisCfg.required ? ' *' : '') + '</label><input id="lf-sv-od-axis" type="number" step="' + axisCfg.step + '" min="' + (axisCfg.min != null ? axisCfg.min : "0") + '" max="' + (axisCfg.max != null ? axisCfg.max : "180") + '" placeholder="e.g. 90" ' + (axisCfg.required ? 'required' : '') + '></div>' +
      '<div class="lf-form-group"><label>Left AXIS' + (axisCfg.required ? ' *' : '') + '</label><input id="lf-sv-os-axis" type="number" step="' + axisCfg.step + '" min="' + (axisCfg.min != null ? axisCfg.min : "0") + '" max="' + (axisCfg.max != null ? axisCfg.max : "180") + '" placeholder="e.g. 85" ' + (axisCfg.required ? 'required' : '') + '></div></div>' +
      (addCfg.required || node.config.add ? '<div class="lf-form-row"><div class="lf-form-group"><label>Right ADD' + (addCfg.required ? ' *' : '') + '</label><input id="lf-sv-od-add" type="number" step="' + addCfg.step + '" min="' + (addCfg.min != null ? addCfg.min : "0") + '" max="' + (addCfg.max != null ? addCfg.max : "4") + '" placeholder="e.g. +1.00"></div>' +
      '<div class="lf-form-group"><label>Left ADD' + (addCfg.required ? ' *' : '') + '</label><input id="lf-sv-os-add" type="number" step="' + addCfg.step + '" min="' + (addCfg.min != null ? addCfg.min : "0") + '" max="' + (addCfg.max != null ? addCfg.max : "4") + '" placeholder="e.g. +1.00"></div></div>' : '') +
      '<div class="lf-form-group"><label>PD' + (pdCfg.required ? ' *' : '') + '</label><input id="lf-sv-pd" type="number" step="' + pdCfg.step + '" min="' + (pdCfg.min != null ? pdCfg.min : "45") + '" max="' + (pdCfg.max != null ? pdCfg.max : "85") + '" placeholder="e.g. 63" ' + (pdCfg.required ? 'required' : '') + '></div>';
    footer.innerHTML =
      '<button class="lf-btn lf-btn-secondary" onclick="window.LensFlow.prevStep()">Back</button>' +
      '<button class="lf-btn lf-btn-primary" onclick="window.LensFlow.collectSingleVisionData()">Continue</button>';
  },

  collectSingleVisionData: function() {
    var node = this.flow.config.nodes[this.currentStep];
    var data = {
      od_sph: parseFloat(document.getElementById("lf-sv-od-sph").value) || undefined,
      os_sph: parseFloat(document.getElementById("lf-sv-os-sph").value) || undefined,
      od_cyl: parseFloat(document.getElementById("lf-sv-od-cyl").value) || undefined,
      os_cyl: parseFloat(document.getElementById("lf-sv-os-cyl").value) || undefined,
      od_axis: parseFloat(document.getElementById("lf-sv-od-axis").value) || undefined,
      os_axis: parseFloat(document.getElementById("lf-sv-os-axis").value) || undefined,
      pd: parseFloat(document.getElementById("lf-sv-pd").value) || undefined
    };
    var addEl = document.getElementById("lf-sv-od-add");
    if (addEl) {
      data.od_add = parseFloat(addEl.value) || undefined;
      data.os_add = parseFloat((document.getElementById("lf-sv-os-add") || {}).value) || undefined;
    }

    var errors = [];
    var fCfg = this.getFormConfig;
    ["sph","cyl","axis"].forEach(function(f) {
      var c = fCfg(f, node);
      var odErr = this.validateFormField(data["od_" + f], c, "Right " + f.toUpperCase());
      var osErr = this.validateFormField(data["os_" + f], c, "Left " + f.toUpperCase());
      if (odErr) errors.push(odErr);
      if (osErr) errors.push(osErr);
    }.bind(this));
    var pdCfg = fCfg("pd", node);
    var pdErr = this.validateFormField(data.pd, pdCfg, "PD");
    if (pdErr) errors.push(pdErr);
    if (addEl) {
      var addCfg = fCfg("add", node);
      var addOdErr = this.validateFormField(data.od_add, addCfg, "Right ADD");
      var addOsErr = this.validateFormField(data.os_add, addCfg, "Left ADD");
      if (addOdErr) errors.push(addOdErr);
      if (addOsErr) errors.push(addOsErr);
    }
    errors = errors.concat(this.validateMedicalConstraints(data, node));

    if (errors.length > 0) { this.showFormErrors(errors); return; }
    this.selections.prescriptionData = data;
    this.nextStep();
  },

  renderReview: function(body, footer) {
    var self = this;
    var sel = this.selections;
    var framePrice = this.getCurrentVariantPrice();
    var lensPrice = sel.lensPrice || 0;
    var total = (framePrice + lensPrice).toFixed(2);

    var typeLabels = { non_prescription: "Non-Rx", single_vision: "Single Vision", progressive: "Progressive", reading: "Reading" };
    var lensName = sel.lensProductTitle || sel.lensOptionId || "";

    body.innerHTML =
      '<div class="lf-review-item"><span class="lf-review-label">Frame</span><span class="lf-review-value">$' + framePrice.toFixed(2) + '</span></div>' +
      '<div class="lf-review-item"><span class="lf-review-label">Prescription</span><span class="lf-review-value">' + (typeLabels[sel.prescriptionType] || "Not selected") + '</span></div>' +
      '<div class="lf-review-item"><span class="lf-review-label">Lens</span><span class="lf-review-value">' + lensName + ' (+$' + lensPrice.toFixed(2) + ')</span></div>' +
      (sel.lensVariants ? '<div class="lf-review-item"><span class="lf-review-label">Lens Options</span><span class="lf-review-value">' + sel.lensVariants + '</span></div>' : '') +
      (sel.prescriptionData ? '<div class="lf-review-item"><span class="lf-review-label">Rx Data</span><span class="lf-review-value">Provided</span></div>' : '') +
      (self.uploadedFile ? '<div class="lf-review-item"><span class="lf-review-label">Rx File</span><span class="lf-review-value">' + self.uploadedFile.name + '</span></div>' : '') +
      '<div class="lf-bundle-price">$' + total + '</div>' +
      '<p style="text-align:center;font-size:13px;color:var(--lf-text2)">Frame + Lenses Bundle</p>';

    footer.innerHTML =
      '<button class="lf-btn lf-btn-secondary" onclick="window.LensFlow.prevStep()">Back</button>' +
      '<button class="lf-btn lf-btn-primary" id="lf-add-to-cart" onclick="window.LensFlow.addBundleToCart()">&#x1f6d2; Add Bundle to Cart &middot; $' + total + '</button>';
  },

  renderCustomStep: function(body, footer, node) {
    var title = node.name || node.ref || "";
    var content = node.content || "";
    var imageUrl = node.imageUrl || "";

    var html = '';
    if (title) html += '<h3 style="margin:0 0 12px 0;font-size:16px;font-weight:600">' + title + '</h3>';
    if (imageUrl) html += '<img src="' + imageUrl + '" alt="' + (title || '') + '" style="max-width:100%;border-radius:8px;margin-bottom:12px" onerror="this.style.display=\'none\'">';
    if (content) html += '<div style="line-height:1.6;color:var(--lf-text);white-space:pre-wrap">' + content + '</div>';
    if (!title && !content && !imageUrl) html += '<p style="color:var(--lf-text2);text-align:center;padding:20px">No custom content configured for this step.</p>';

    body.innerHTML = html;
    footer.innerHTML =
      '<button class="lf-btn lf-btn-secondary" onclick="window.LensFlow.prevStep()">Back</button>' +
      '<button class="lf-btn lf-btn-primary" onclick="window.LensFlow.nextStep()">Continue</button>';
  },

  renderComplete: function() {
    var progress = document.getElementById("lf-progress");
    if (progress) progress.innerHTML = "";
    var title = document.getElementById("lf-step-title");
    if (title) title.textContent = "Ready!";
    var body = document.getElementById("lf-body");
    if (body) body.innerHTML =
      '<div style="text-align:center;padding:40px"><div style="font-size:48px;margin-bottom:16px">&#x2705;</div><h3>Bundle created!</h3><p style="color:var(--lf-text2);margin-top:8px">Frame + Lenses added to your cart.</p></div>';
    var footer = document.getElementById("lf-footer");
    if (footer) footer.innerHTML =
      '<button class="lf-btn lf-btn-primary lf-btn-full" onclick="window.LensFlow.closeModal();window.LensFlow.viewCart();">View Cart</button>';
  },

  addBundleToCart: function() {
    var self = this;
    var btn = document.getElementById("lf-add-to-cart");
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="lf-spinner"></span> Checking...';

    var proxyPath = (this.config.proxyUrl || "").replace(/\/+$/, "");
    var orderId = "order-" + Date.now();
    var frameVariantId = this.getCurrentVariantId();

    // helper: unwrap { status, body } envelope from backend
    var unwrap = function(data) { return (data && data.body) ? data.body : data; };

    this.checkInventory(frameVariantId)
      .then(function(available) {
        if (!available) {
          throw new Error("This product is currently out of stock. Please try again later.");
        }
        btn.innerHTML = '<span class="lf-spinner"></span> Creating Bundle...';

        var lensVariantId = self.selections.lensVariantId || frameVariantId;
        return fetch(proxyPath + "/api/bundles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: orderId,
            productId: self.config.productId,
            frameVariantId: frameVariantId || "",
            lensVariantId: lensVariantId || "",
            lensProductId: self.selections.lensProductId || "",
            lensOptionId: self.selections.lensOptionId || "",
            lensVariants: self.selections.lensVariants || ""
          })
        });
      })
    .then(function(r) { return r ? r.json().then(unwrap) : null; })
    .then(function(bundle) {
      if (!bundle || !bundle.id) {
        throw new Error("Bundle creation failed — no bundle ID returned");
      }
      if (bundle.error) { throw new Error(bundle.error); }
      self.bundleId = bundle.id;
      return fetch(proxyPath + "/api/bundles/" + bundle.id + "/confirm", { method: "POST" });
    })
    .then(function(r) { return r ? r.json().then(unwrap) : null; })
    .then(function(confirmed) {
      var props = (confirmed && confirmed.cartProperties) ? confirmed.cartProperties : {};
      self.addToShopifyCart(props, self.selections.lensPrice || 0);
    })
    .catch(function(e) {
      btn.disabled = false;
      btn.innerHTML = "&#x1f6d2; Add Bundle to Cart";
      var body = document.getElementById("lf-body");
      if (body) {
        body.insertAdjacentHTML("afterbegin", '<p class="lf-alert lf-alert-error">' + (e.message || "Unknown error") + '</p>');
      }
    });
  },

  checkInventory: function(variantId) {
    var id = parseInt(variantId);
    if (!id) return Promise.resolve(true);
    return fetch("/products/" + (this.config.productHandle || "") + ".js")
      .then(function(r) { return r.json(); })
      .then(function(product) {
        var variant = (product.variants || []).find(function(v) { return v.id === id; });
        if (!variant) return true;
        if (variant.inventory_management && variant.inventory_quantity !== undefined && variant.inventory_quantity <= 0) {
          return !variant.inventory_policy || variant.inventory_policy === "deny";
        }
        return true;
      })
      .catch(function() { return true; });
  },

  addToShopifyCart: function(props, lensPrice) {
    var self = this;
    var frameVariantId = this.getCurrentVariantId();
    var frameParsedId = parseInt(frameVariantId);
    if (!frameParsedId || frameParsedId <= 0) {
      this.renderComplete();
      return;
    }

    var extractNumericId = function(gid) {
      if (!gid) return 0;
      var parts = String(gid).split('/');
      var last = parts[parts.length - 1];
      var num = parseInt(last);
      return isNaN(num) ? 0 : num;
    };

    var lensVariantId = extractNumericId(self.selections.lensVariantId);
    var addLens = lensVariantId > 0;

    // Step 1: Add frame to cart
    this.addItemToCart(frameParsedId, 1, props || {}).then(function() {
      // Step 2: Add lens after a delay (avoid 429 rate limit)
      if (addLens) {
        return new Promise(function(resolve) {
          setTimeout(function() {
            var lensProps = {
              '_lensflow_lens': 'true',
              '_lensflow_option': self.selections.lensOptionId || '',
              '_lensflow_price': String(self.selections.lensPrice || 0)
            };
            self.addItemToCart(lensVariantId, 1, lensProps).then(resolve).catch(resolve);
          }, 600);
        });
      }
    }).then(function() {
      self.renderComplete();
      self.openCartDrawer();
    }).catch(function(e) {
      self.renderComplete();
      console.error('[LensFlow] addToShopifyCart failed:', e);
      self.openCartDrawer();
    });
  },

  addItemToCart: function(variantId, qty, props) {
    return fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: variantId,
        quantity: qty || 1,
        properties: props || {}
      })
    }).then(function(r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r;
    });
  },

  openCartDrawer: function() {
    if (this.themeInfo && this.themeInfo.hasCartDrawer && this.themeInfo.cartDrawerSelector) {
      if (this.themeInfo.isDawn) {
        var drawer = document.querySelector('cart-drawer');
        if (drawer && typeof drawer.open === 'function') {
          setTimeout(function() { drawer.open(); }, 300);
          return;
        }
      }
      document.documentElement.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
    }
  },

  viewCart: function() {
    if (this.themeInfo && this.themeInfo.hasCartDrawer) {
      this.openCartDrawer();
    } else {
      window.location.href = '/cart';
    }
  },

  getCurrentVariantId: function() {
    var input = document.querySelector('input[name="id"]');
    if (input) return input.value;
    var select = document.querySelector('select[name="id"]');
    if (select) return select.value;
    return null;
  },

  getCurrentVariantPrice: function() {
    var priceEl = document.querySelector('[data-price]') || document.querySelector('.price-item--regular') || document.querySelector('.price__current');
    if (priceEl) {
      var text = (priceEl.textContent || "").replace(/[^0-9.]/g, "");
      return parseFloat(text) || 0;
    }
    return 0;
  },

  nextStep: function() {
    var nodes = (this.flow && this.flow.config && this.flow.config.nodes) || [];
    var jumpRules = (this.flow && this.flow.config && this.flow.config.jumpRules) || [];
    var fromNode = nodes[this.currentStep];

    // 先看是否有适用的 jumpRule(分支跳转)
    if (fromNode && jumpRules.length > 0) {
      var fromRef = fromNode.ref || fromNode.id;
      var matchedRule = null;
      for (var i = 0; i < jumpRules.length; i++) {
        var rule = jumpRules[i];
        // Match by fromNodeRef (new) or fromNodeIndex (legacy)
        var fromRefMatch = rule.fromNodeRef && rule.fromNodeRef === fromRef;
        var fromIdxMatch = rule.fromNodeIndex != null && rule.fromNodeIndex === this.currentStep;
        if (!fromRefMatch && !fromIdxMatch) continue;
        if (this.evalCondition(rule.condition)) {
          matchedRule = rule;
          break;
        }
      }
      // Resolve toNodeRef (new) or toNodeIndex (legacy)
      if (matchedRule) {
        var targetIdx = -1;
        if (matchedRule.toNodeRef) {
          targetIdx = nodes.findIndex(function(n) { return (n.ref || n.id) === matchedRule.toNodeRef; });
        } else if (matchedRule.toNodeIndex != null) {
          targetIdx = matchedRule.toNodeIndex;
        }
        if (targetIdx >= 0) {
          this.currentStep = targetIdx;
          this.renderStep();
          return;
        }
      }
    }

    // 普通递增 + displayCondition 不满足时自动跳过
    var nextIdx = this.currentStep + 1;
    while (nextIdx < nodes.length) {
      var n = nodes[nextIdx];
      if (this.shouldShowNode(n)) break;
      nextIdx++;
    }
    if (nextIdx >= nodes.length) {
      this.renderComplete();
      return;
    }
    this.currentStep = nextIdx;
    this.renderStep();
  },

  shouldShowNode: function(node) {
    if (!node || !node.displayCondition) return true;
    var cond = node.displayCondition;
    // 兼容数组与单对象
    if (Array.isArray(cond)) {
      if (cond.length === 0) return true;
      for (var i = 0; i < cond.length; i++) {
        if (!this.evalCondition(cond[i])) return false;
      }
      return true;
    }
    return this.evalCondition(cond);
  },

  evalCondition: function(c) {
    if (!c || !c.field) return true;
    var ctx = {
      prescriptionType: this.selections.prescriptionType || "",
      productType: (this.config && this.config.productType) || "",
      tags: (this.config && this.config.tags) || [],
      submitMethod: this.selections.submitMethod || "",
    };
    // 同时取 prescription 表单已填的字段(od_sph 等)
    var rxData = this.selections.prescriptionData || {};
    Object.keys(rxData).forEach(function(k) { ctx[k] = rxData[k]; });
    var v = ctx[c.field];
    var op = c.operator || c.op || "eq";
    var target = c.value;
    if (op === "eq") return String(v) === String(target);
    if (op === "neq") return String(v) !== String(target);
    if (op === "contains" || op === "includes") return Array.isArray(v) ? v.indexOf(target) >= 0 : String(v || "").indexOf(target) >= 0;
    if (op === "gt") return Number(v) > Number(target);
    if (op === "lt") return Number(v) < Number(target);
    if (op === "gte") return Number(v) >= Number(target);
    if (op === "lte") return Number(v) <= Number(target);
    return true;
  },

  prevStep: function() {
    var nodes = (this.flow && this.flow.config && this.flow.config.nodes) || [];
    var idx = this.currentStep - 1;
    while (idx >= 0) {
      if (this.shouldShowNode(nodes[idx])) break;
      idx--;
    }
    if (idx >= 0) {
      this.currentStep = idx;
      this.renderStep();
    }
  },

  clearOverlays: function() {
    var els = document.querySelectorAll(".lf-overlay, .lf-drawer-overlay, .lf-inline-wrapper");
    els.forEach(function(e) { if (e && e.parentNode) e.parentNode.removeChild(e); });
    document.body.classList.remove('lf-inline-open');
  },

  showLoading: function() {
    this.clearOverlays();
    var overlay = document.createElement("div");
    overlay.className = "lf-overlay";
    overlay.innerHTML = '<div class="lf-modal" style="text-align:center;padding:60px"><div class="lf-spinner" style="border-color:var(--lf-primary);border-top-color:transparent;width:40px;height:40px;margin:0 auto"></div><p style="margin-top:16px">Loading flow...</p></div>';
    document.body.appendChild(overlay);
  },

  showError: function(msg) {
    this.clearOverlays();
    var overlay = document.createElement("div");
    overlay.className = "lf-overlay";
    document.body.appendChild(overlay);
    overlay.innerHTML = '<div class="lf-modal" style="text-align:center;padding:60px"><div style="font-size:48px">&#x26a0;&#xfe0f;</div><p style="margin-top:16px;color:#d82c0d">' + msg + '</p><button class="lf-btn lf-btn-secondary" style="margin-top:20px" onclick="window.LensFlow.closeModal()">Close</button></div>';
  }
};

})();
