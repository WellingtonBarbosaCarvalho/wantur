/**
 * ========================================
 * WANTUR - SCRIPT.JS
 * Landing Page de Alta Conversão
 * ========================================
 */

// ========================================
// CONFIGURAÇÕES GLOBAIS
// ========================================

const CONFIG = {
    // URLs da API (substitua pelos endpoints reais)
    API_ENDPOINTS: {
        SUBMIT_LEAD: 'https://api.wantur.com.br/leads',
        WHATSAPP_API: 'https://api.whatsapp.com/send',
        ANALYTICS: 'https://analytics.wantur.com.br/track'
    },
    
    // Configurações do WhatsApp
    WHATSAPP: {
        NUMBER: '5511999999999',
        MESSAGE_TEMPLATE: 'Olá! Vim da landing page e quero saber mais sobre as passagens com desconto!'
    },
    
    // Configurações de timing
    TIMING: {
        FORM_DELAY: 1500,
        ANIMATION_DELAY: 300,
        COUNTDOWN_INITIAL: 86400, // 24 horas em segundos
        SPOTS_DECREASE_INTERVAL: 300000 // 5 minutos
    },
    
    // Mensagens de feedback
    MESSAGES: {
        SUCCESS: 'Perfeito! Nossa equipe entrará em contato em instantes!',
        ERROR: 'Ops! Algo deu errado. Tente novamente ou nos chame no WhatsApp.',
        VALIDATION_NAME: 'Por favor, digite seu primeiro nome',
        VALIDATION_PHONE: 'Por favor, digite um WhatsApp válido'
    }
};

// ========================================
// ESTADO GLOBAL DA APLICAÇÃO
// ========================================

const AppState = {
    isLoading: false,
    formSubmissions: 0,
    userInteractions: [],
    spotsLeft: 27,
    countdownSeconds: CONFIG.TIMING.COUNTDOWN_INITIAL,
    animatedElements: new Set(),
    
    // Tracking de conversão
    conversion: {
        pageViews: 0,
        formViews: 0,
        formStarts: 0,
        formSubmissions: 0,
        scrollDepth: 0
    }
};

// ========================================
// UTILITÁRIOS GERAIS
// ========================================

const Utils = {
    /**
     * Debounce para otimizar performance
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle para eventos de scroll
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    },

    /**
     * Validação de telefone brasileiro
     */
    validatePhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 11;
    },

    /**
     * Formatação de telefone
     */
    formatPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (cleaned.length === 10) {
            return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return phone;
    },

    /**
     * Validação de nome
     */
    validateName(name) {
        return name.trim().length >= 2 && /^[A-Za-zÀ-ÿ\s]+$/.test(name.trim());
    },

    /**
     * Sanitização de dados
     */
    sanitizeInput(input) {
        return input.trim().replace(/[<>]/g, '');
    },

    /**
     * Geração de ID único
     */
    generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Formatação de números
     */
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },

    /**
     * Smooth scroll para elementos
     */
    smoothScrollTo(elementId, offset = 100) {
        const element = document.getElementById(elementId);
        if (element) {
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }
};

// ========================================
// SISTEMA DE ANALYTICS E TRACKING
// ========================================

const Analytics = {
    /**
     * Inicializar tracking
     */
    init() {
        this.trackPageView();
        this.setupScrollTracking();
        this.setupInteractionTracking();
        this.trackTimeOnPage();
    },

    /**
     * Track de visualização da página
     */
    trackPageView() {
        AppState.conversion.pageViews++;
        this.sendEvent('page_view', {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            referrer: document.referrer,
            userAgent: navigator.userAgent
        });
    },

    /**
     * Track de scroll depth
     */
    setupScrollTracking() {
        let maxScroll = 0;
        const trackScroll = Utils.throttle(() => {
            const scrollPercentage = Math.round(
                (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100
            );
            
            if (scrollPercentage > maxScroll) {
                maxScroll = scrollPercentage;
                AppState.conversion.scrollDepth = maxScroll;
                
                // Marcos importantes de scroll
                if ([25, 50, 75, 90].includes(maxScroll)) {
                    this.sendEvent('scroll_depth', { depth: maxScroll });
                }
            }
        }, 1000);

        window.addEventListener('scroll', trackScroll);
    },

    /**
     * Track de interações
     */
    setupInteractionTracking() {
        // Track de cliques em CTAs
        document.querySelectorAll('.cta-primary, .cta-form, .cta-main-form').forEach(cta => {
            cta.addEventListener('click', (e) => {
                this.sendEvent('cta_click', {
                    element: e.target.className,
                    text: e.target.textContent.trim(),
                    position: this.getElementPosition(e.target)
                });
            });
        });

        // Track de visualização de formulários
        this.setupFormTracking();
    },

    /**
     * Track específico para formulários
     */
    setupFormTracking() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            // Intersection Observer para detectar quando o formulário entra na tela
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !entry.target.dataset.viewed) {
                        entry.target.dataset.viewed = 'true';
                        AppState.conversion.formViews++;
                        this.sendEvent('form_view', { formId: form.id });
                    }
                });
            }, { threshold: 0.5 });

            observer.observe(form);

            // Track de início de preenchimento
            const inputs = form.querySelectorAll('input');
            inputs.forEach(input => {
                let hasStarted = false;
                input.addEventListener('focus', () => {
                    if (!hasStarted) {
                        hasStarted = true;
                        AppState.conversion.formStarts++;
                        this.sendEvent('form_start', { formId: form.id });
                    }
                });
            });
        });
    },

    /**
     * Track de tempo na página
     */
    trackTimeOnPage() {
        const startTime = Date.now();
        
        // Track a cada minuto
        setInterval(() => {
            const timeSpent = Math.floor((Date.now() - startTime) / 1000);
            this.sendEvent('time_on_page', { seconds: timeSpent });
        }, 60000);

        // Track no unload
        window.addEventListener('beforeunload', () => {
            const timeSpent = Math.floor((Date.now() - startTime) / 1000);
            this.sendEvent('session_end', { totalTime: timeSpent });
        });
    },

    /**
     * Envio de eventos para analytics
     */
    sendEvent(eventName, data) {
        // Simular envio para API de analytics
        if (window.gtag) {
            window.gtag('event', eventName, data);
        }
        
        // Log para desenvolvimento
        console.log('Analytics Event:', eventName, data);
        
        // Aqui você pode implementar o envio real para sua API
        // fetch(CONFIG.API_ENDPOINTS.ANALYTICS, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ event: eventName, data, timestamp: new Date().toISOString() })
        // });
    },

    /**
     * Obter posição do elemento na página
     */
    getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height
        };
    }
};

// ========================================
// SISTEMA DE ANIMAÇÕES
// ========================================

const Animations = {
    /**
     * Inicializar animações
     */
    init() {
        this.setupScrollAnimations();
        this.setupCounters();
        this.setupFloatingElements();
        this.setupMicroInteractions();
    },

    /**
     * Animações no scroll
     */
    setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !AppState.animatedElements.has(entry.target)) {
                    AppState.animatedElements.add(entry.target);
                    entry.target.classList.add('visible');
                    
                    // Animação em cascata para elementos filhos
                    const children = entry.target.querySelectorAll('.benefit-card, .testimonial-card, .step');
                    children.forEach((child, index) => {
                        setTimeout(() => {
                            child.style.transform = 'translateY(0)';
                            child.style.opacity = '1';
                        }, index * 150);
                    });
                }
            });
        }, observerOptions);

        // Observar elementos com animação
        document.querySelectorAll('.fade-in, .benefit-card, .testimonial-card, .step').forEach(el => {
            observer.observe(el);
        });
    },

    /**
     * Contadores animados
     */
    setupCounters() {
        const counters = document.querySelectorAll('.stat-number');
        
        const animateCounter = (counter) => {
            const target = parseInt(counter.dataset.count);
            const increment = target / 100;
            let current = 0;
            
            const updateCounter = () => {
                if (current < target) {
                    current += increment;
                    if (target >= 1000) {
                        counter.textContent = Utils.formatNumber(Math.floor(current));
                    } else {
                        counter.textContent = Math.floor(current);
                    }
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target >= 1000 ? Utils.formatNumber(target) : target;
                }
            };
            
            updateCounter();
        };

        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.dataset.animated) {
                    entry.target.dataset.animated = 'true';
                    setTimeout(() => animateCounter(entry.target), 300);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(counter => counterObserver.observe(counter));
    },

    /**
     * Elementos flutuantes
     */
    setupFloatingElements() {
        const floatingElements = document.querySelectorAll('.floating-element');
        
        floatingElements.forEach((element, index) => {
            // Movimento aleatório suave
            setInterval(() => {
                const x = Math.sin(Date.now() * 0.001 + index) * 10;
                const y = Math.cos(Date.now() * 0.0008 + index) * 8;
                element.style.transform = `translate(${x}px, ${y}px) rotate(${x * 0.5}deg)`;
            }, 50);
        });
    },

    /**
     * Micro-interações
     */
    setupMicroInteractions() {
        // Efeito de hover em cards
        document.querySelectorAll('.benefit-card, .testimonial-card').forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-8px) scale(1.02)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) scale(1)';
            });
        });

        // Efeito de ripple em botões
        document.querySelectorAll('.cta-primary, .cta-form, .cta-main-form').forEach(button => {
            button.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.cssText = `
                    position: absolute;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.3);
                    transform: scale(0);
                    animation: ripple-effect 0.6s linear;
                    left: ${x}px;
                    top: ${y}px;
                    width: ${size}px;
                    height: ${size}px;
                `;
                
                this.style.position = 'relative';
                this.style.overflow = 'hidden';
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });

        // Adicionar CSS para ripple effect
        const style = document.createElement('style');
        style.textContent = `
            @keyframes ripple-effect {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// ========================================
// SISTEMA DE COUNTDOWN E URGÊNCIA
// ========================================

const UrgencySystem = {
    /**
     * Inicializar sistema de urgência
     */
    init() {
        this.startCountdown();
        this.startSpotsCountdown();
        this.createUrgencyElements();
    },

    /**
     * Countdown principal
     */
    startCountdown() {
        const updateCountdown = () => {
            if (AppState.countdownSeconds <= 0) {
                AppState.countdownSeconds = CONFIG.TIMING.COUNTDOWN_INITIAL; // Reset
            }

            const hours = Math.floor(AppState.countdownSeconds / 3600);
            const minutes = Math.floor((AppState.countdownSeconds % 3600) / 60);
            const seconds = AppState.countdownSeconds % 60;

            const hoursElement = document.getElementById('hours');
            const minutesElement = document.getElementById('minutes');
            const secondsElement = document.getElementById('seconds');

            if (hoursElement) hoursElement.textContent = hours.toString().padStart(2, '0');
            if (minutesElement) minutesElement.textContent = minutes.toString().padStart(2, '0');
            if (secondsElement) secondsElement.textContent = seconds.toString().padStart(2, '0');

            // Efeito visual quando restam poucos segundos
            if (AppState.countdownSeconds <= 300) { // 5 minutos
                document.getElementById('countdown')?.classList.add('urgency-indicator');
            }

            AppState.countdownSeconds--;
        };

        updateCountdown();
        setInterval(updateCountdown, 1000);
    },

    /**
     * Countdown de vagas
     */
    startSpotsCountdown() {
        const updateSpots = () => {
            if (AppState.spotsLeft > 3) {
                AppState.spotsLeft -= Math.floor(Math.random() * 2) + 1;
                
                document.querySelectorAll('#spotsLeft, #mainSpotsLeft').forEach(element => {
                    element.textContent = AppState.spotsLeft;
                    
                    // Animação de mudança
                    element.style.transform = 'scale(1.2)';
                    element.style.color = '#ff4757';
                    
                    setTimeout(() => {
                        element.style.transform = 'scale(1)';
                        element.style.color = '';
                    }, 300);
                });

                // Analytics
                Analytics.sendEvent('spots_updated', { remaining: AppState.spotsLeft });
            }
        };

        // Atualizar vagas a cada 5 minutos
        setInterval(updateSpots, CONFIG.TIMING.SPOTS_DECREASE_INTERVAL);
    },

    /**
     * Criar elementos de urgência dinâmicos
     */
    createUrgencyElements() {
        // Notificação popup de outras pessoas comprando
        setInterval(() => {
            this.showPurchaseNotification();
        }, 45000); // A cada 45 segundos

        // Indicador de usuários online
        this.showOnlineUsers();
    },

    /**
     * Notificação de compra
     */
    showPurchaseNotification() {
        const names = ['Maria', 'João', 'Ana', 'Carlos', 'Fernanda', 'Roberto', 'Juliana', 'Pedro'];
        const cities = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Brasília', 'Salvador', 'Fortaleza'];
        const savings = ['R$ 850', 'R$ 1.200', 'R$ 950', 'R$ 1.800', 'R$ 1.100', 'R$ 750'];
        
        const notification = document.createElement('div');
        notification.className = 'purchase-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-avatar">🎉</div>
                <div class="notification-text">
                    <strong>${names[Math.floor(Math.random() * names.length)]}</strong> de ${cities[Math.floor(Math.random() * cities.length)]}
                    <br>acabou de economizar <strong>${savings[Math.floor(Math.random() * savings.length)]}</strong>!
                </div>
            </div>
        `;
        
        // Adicionar CSS
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .purchase-notification {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    background: white;
                    padding: 1rem;
                    border-radius: 10px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    border-left: 4px solid #28a745;
                    z-index: 1000;
                    transform: translateX(-120%);
                    transition: all 0.5s ease;
                    max-width: 300px;
                }
                
                .purchase-notification.show {
                    transform: translateX(0);
                }
                
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .notification-avatar {
                    font-size: 1.5rem;
                    flex-shrink: 0;
                }
                
                .notification-text {
                    font-size: 0.85rem;
                    color: #333;
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Animação
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, 5000);
    },

    /**
     * Indicador de usuários online
     */
    showOnlineUsers() {
        const onlineCount = Math.floor(Math.random() * 50) + 150; // Entre 150-200
        
        const indicator = document.createElement('div');
        indicator.className = 'online-indicator';
        indicator.innerHTML = `
            <div class="online-dot"></div>
            <span>${onlineCount} pessoas online agora</span>
        `;
        
        // CSS para o indicador
        if (!document.querySelector('#online-styles')) {
            const style = document.createElement('style');
            style.id = 'online-styles';
            style.textContent = `
                .online-indicator {
                    position: fixed;
                    top: 50%;
                    right: 20px;
                    background: rgba(40, 167, 69, 0.9);
                    color: white;
                    padding: 0.8rem 1.2rem;
                    border-radius: 25px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    z-index: 1000;
                    transform: translateX(120%);
                    transition: all 0.5s ease;
                }
                
                .online-indicator.show {
                    transform: translateX(0);
                }
                
                .online-dot {
                    width: 8px;
                    height: 8px;
                    background: #fff;
                    border-radius: 50%;
                    animation: pulse-dot 2s infinite;
                }
                
                @keyframes pulse-dot {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(indicator);
        
        setTimeout(() => indicator.classList.add('show'), 2000);
        setTimeout(() => {
            indicator.classList.remove('show');
            setTimeout(() => indicator.remove(), 500);
        }, 8000);
    }
};

// ========================================
// SISTEMA DE FORMULÁRIOS
// ========================================

const FormSystem = {
    /**
     * Inicializar sistema de formulários
     */
    init() {
        this.setupFormValidation();
        this.setupFormSubmission();
        this.setupInputFormatting();
        this.setupFormAnalytics();
    },

    /**
     * Validação em tempo real
     */
    setupFormValidation() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            const nameInput = form.querySelector('input[name="name"]');
            const phoneInput = form.querySelector('input[name="phone"]');
            
            if (nameInput) {
                nameInput.addEventListener('input', (e) => {
                    this.validateNameField(e.target);
                });
                
                nameInput.addEventListener('blur', (e) => {
                    this.validateNameField(e.target, true);
                });
            }
            
            if (phoneInput) {
                phoneInput.addEventListener('input', (e) => {
                    this.formatPhoneInput(e.target);
                    this.validatePhoneField(e.target);
                });
                
                phoneInput.addEventListener('blur', (e) => {
                    this.validatePhoneField(e.target, true);
                });
            }
        });
    },

    /**
     * Validação do campo nome
     */
    validateNameField(input, showError = false) {
        const isValid = Utils.validateName(input.value);
        
        if (isValid) {
            input.classList.remove('error');
            input.classList.add('valid');
            this.removeFieldError(input);
        } else if (showError) {
            input.classList.remove('valid');
            input.classList.add('error');
            this.showFieldError(input, CONFIG.MESSAGES.VALIDATION_NAME);
        }
        
        return isValid;
    },

    /**
     * Validação do campo telefone
     */
    validatePhoneField(input, showError = false) {
        const isValid = Utils.validatePhone(input.value);
        
        if (isValid) {
            input.classList.remove('error');
            input.classList.add('valid');
            this.removeFieldError(input);
        } else if (showError) {
            input.classList.remove('valid');
            input.classList.add('error');
            this.showFieldError(input, CONFIG.MESSAGES.VALIDATION_PHONE);
        }
        
        return isValid;
    },

    /**
     * Formatação do campo telefone
     */
    formatPhoneInput(input) {
        const formatted = Utils.formatPhone(input.value);
        input.value = formatted;
    },

    /**
     * Mostrar erro do campo
     */
    showFieldError(input, message) {
        this.removeFieldError(input);
        
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        
        input.parentNode.appendChild(errorElement);
        
        // CSS para erro
        if (!document.querySelector('#field-error-styles')) {
            const style = document.createElement('style');
            style.id = 'field-error-styles';
            style.textContent = `
                .field-error {
                    color: #ff4757;
                    font-size: 0.8rem;
                    margin-top: 0.5rem;
                    animation: shake 0.3s ease;
                }
                
                .form-group input.error {
                    border-color: #ff4757;
                    background-color: #fff5f5;
                }
                
                .form-group input.valid {
                    border-color: #28a745;
                    background-color: #f8fff8;
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            `;
            document.head.appendChild(style);
        }
    },

    /**
     * Remover erro do campo
     */
    removeFieldError(input) {
        const existingError = input.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    },

    /**
     * Submissão de formulários
     */
    setupFormSubmission() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleFormSubmit(form);
            });
        });
    },

    /**
     * Processar submissão do formulário
     */
    async handleFormSubmit(form) {
        if (AppState.isLoading) return;
        
        const nameInput = form.querySelector('input[name="name"]');
        const phoneInput = form.querySelector('input[name="phone"]');
        const submitButton = form.querySelector('button[type="submit"]');
        
        const name = Utils.sanitizeInput(nameInput.value);
        const phone = Utils.sanitizeInput(phoneInput.value);
        
        // Validação
        const isNameValid = this.validateNameField(nameInput, true);
        const isPhoneValid = this.validatePhoneField(phoneInput, true);
        
        if (!isNameValid || !isPhoneValid) {
            this.shakeForm(form);
            return;
        }
        
        // Preparar dados
        const leadData = {
            id: Utils.generateUniqueId(),
            name: name,
            phone: phone,
            source: 'landing_page',
            formId: form.id,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            url: window.location.href,
            conversion: AppState.conversion
        };
        
        // UI de loading
        this.setFormLoading(form, submitButton, true);
        
        try {
            // Enviar lead
            await this.submitLead(leadData);
            
            // Sucesso
            this.showFormSuccess(form, submitButton, name);
            
            // Analytics
            AppState.conversion.formSubmissions++;
            Analytics.sendEvent('form_submit', leadData);
            
            // Redirecionar para WhatsApp após delay
            setTimeout(() => {
                this.redirectToWhatsApp(name, phone);
            }, 3000);
            
        } catch (error) {
            console.error('Erro ao enviar formulário:', error);
            this.showFormError(form, submitButton);
            Analytics.sendEvent('form_error', { error: error.message, formId: form.id });
        }
    },

    /**
     * Enviar lead para API
     */
    async submitLead(leadData) {
        // Simular delay de API
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Aqui você implementaria o envio real para sua API
        // const response = await fetch(CONFIG.API_ENDPOINTS.SUBMIT_LEAD, {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify(leadData)
        // });
        // 
        // if (!response.ok) {
        //     throw new Error('Erro ao enviar lead');
        // }
        // 
        // return response.json();
        
        // Simular sucesso para desenvolvimento
        console.log('Lead enviado:', leadData);
        return { success: true, id: leadData.id };
    },

    /**
     * Estado de loading do formulário
     */
    setFormLoading(form, button, isLoading) {
        AppState.isLoading = isLoading;
        
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
            
            const originalText = button.innerHTML;
            button.dataset.originalText = originalText;
            button.innerHTML = `
                <span class="loading-spinner"></span>
                ENVIANDO...
            `;
            
            // CSS para loading
            if (!document.querySelector('#loading-styles')) {
                const style = document.createElement('style');
                style.id = 'loading-styles';
                style.textContent = `
                    .loading-spinner {
                        display: inline-block;
                        width: 16px;
                        height: 16px;
                        border: 2px solid rgba(255,255,255,0.3);
                        border-top: 2px solid white;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-right: 0.5rem;
                    }
                `;
                document.head.appendChild(style);
            }
        } else {
            button.classList.remove('loading');
            button.disabled = false;
            if (button.dataset.originalText) {
                button.innerHTML = button.dataset.originalText;
            }
        }
    },

    /**
     * Mostrar sucesso do formulário
     */
    showFormSuccess(form, button, name) {
        this.setFormLoading(form, button, false);
        
        button.classList.add('success-state');
        button.innerHTML = `
            <span style="margin-right: 0.5rem;">✓</span>
            ENVIADO COM SUCESSO!
        `;
        
        // Mostrar mensagem de sucesso
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.innerHTML = `
            <div class="success-content">
                <div class="success-icon">🎉</div>
                <div class="success-text">
                    <h4>Perfeito, ${name}!</h4>
                    <p>Nossa equipe entrará em contato via WhatsApp em instantes!</p>
                    <small>Redirecionando para o WhatsApp...</small>
                </div>
            </div>
        `;
        
        // CSS para sucesso
        if (!document.querySelector('#success-styles')) {
            const style = document.createElement('style');
            style.id = 'success-styles';
            style.textContent = `
                .success-message {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: white;
                    padding: 2rem;
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    z-index: 10000;
                    border: 3px solid #28a745;
                    animation: successPop 0.5s ease;
                }
                
                .success-content {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    text-align: left;
                }
                
                .success-icon {
                    font-size: 3rem;
                    flex-shrink: 0;
                }
                
                .success-text h4 {
                    color: #28a745;
                    margin-bottom: 0.5rem;
                }
                
                .success-text p {
                    color: #333;
                    margin-bottom: 0.5rem;
                }
                
                .success-text small {
                    color: #666;
                }
                
                @keyframes successPop {
                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        form.appendChild(successMessage);
        
        // Remover após delay
        setTimeout(() => {
            successMessage.remove();
        }, 4000);
    },

    /**
     * Mostrar erro do formulário
     */
    showFormError(form, button) {
        this.setFormLoading(form, button, false);
        
        button.style.background = '#ff4757';
        button.innerHTML = 'ERRO - TENTE NOVAMENTE';
        
        setTimeout(() => {
            button.style.background = '';
            if (button.dataset.originalText) {
                button.innerHTML = button.dataset.originalText;
            }
        }, 3000);
        
        this.shakeForm(form);
    },

    /**
     * Efeito de shake no formulário
     */
    shakeForm(form) {
        form.style.animation = 'shake 0.5s ease';
        setTimeout(() => {
            form.style.animation = '';
        }, 500);
    },

    /**
     * Redirecionar para WhatsApp
     */
    redirectToWhatsApp(name, phone) {
        const message = `Olá! Sou ${name} e vim da landing page da WANTUR. Gostaria de saber mais sobre as passagens com desconto! Meu telefone: ${phone}`;
        const whatsappUrl = `https://wa.me/${CONFIG.WHATSAPP.NUMBER}?text=${encodeURIComponent(message)}`;
        
        window.open(whatsappUrl, '_blank');
    },

    /**
     * Analytics de formulários
     */
    setupFormAnalytics() {
        // Track de abandono de formulário
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input');
            let hasInteracted = false;
            
            inputs.forEach(input => {
                input.addEventListener('focus', () => {
                    if (!hasInteracted) {
                        hasInteracted = true;
                        Analytics.sendEvent('form_interaction_start', { formId: form.id });
                    }
                });
            });
            
            // Track ao sair da página sem enviar
            window.addEventListener('beforeunload', () => {
                if (hasInteracted && !form.querySelector('.success-state')) {
                    Analytics.sendEvent('form_abandon', { formId: form.id });
                }
            });
        });
    },

    /**
     * Formatação de outros inputs
     */
    setupInputFormatting() {
        // Formatação automática de campos
        document.querySelectorAll('input[type="text"]').forEach(input => {
            if (input.name === 'name') {
                input.addEventListener('input', (e) => {
                    // Capitalizar primeira letra
                    const words = e.target.value.toLowerCase().split(' ');
                    const capitalized = words.map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');
                    e.target.value = capitalized;
                });
            }
        });
    }
};

// ========================================
// SISTEMA DE NAVEGAÇÃO
// ========================================

const Navigation = {
    /**
     * Inicializar navegação
     */
    init() {
        this.setupSmoothScroll();
        this.setupStickyHeader();
        this.setupScrollToTop();
    },

    /**
     * Scroll suave para âncoras
     */
    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    const offsetTop = targetElement.getBoundingClientRect().top + window.pageYOffset - 100;
                    
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                    
                    // Analytics
                    Analytics.sendEvent('anchor_click', { target: targetId });
                }
            });
        });
    },

    /**
     * Header sticky
     */
    setupStickyHeader() {
        const header = document.querySelector('.main-nav');
        const urgencyBar = document.querySelector('.urgency-bar');
        
        if (header) {
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (!entry.isIntersecting) {
                        header.classList.add('sticky');
                    } else {
                        header.classList.remove('sticky');
                    }
                },
                { threshold: 0 }
            );
            
            if (urgencyBar) {
                observer.observe(urgencyBar);
            }
        }
    },

    /**
     * Botão scroll to top
     */
    setupScrollToTop() {
        const scrollTopButton = document.createElement('button');
        scrollTopButton.className = 'scroll-to-top';
        scrollTopButton.innerHTML = '↑';
        scrollTopButton.setAttribute('aria-label', 'Voltar ao topo');
        
        document.body.appendChild(scrollTopButton);
        
        // CSS
        if (!document.querySelector('#scroll-top-styles')) {
            const style = document.createElement('style');
            style.id = 'scroll-top-styles';
            style.textContent = `
                .scroll-to-top {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    width: 50px;
                    height: 50px;
                    background: linear-gradient(45deg, #667eea, #764ba2);
                    color: white;
                    border: none;
                    border-radius: 50%;
                    font-size: 1.5rem;
                    cursor: pointer;
                    z-index: 1000;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                }
                
                .scroll-to-top.visible {
                    opacity: 1;
                    visibility: visible;
                }
                
                .scroll-to-top:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                }
            `;
            document.head.appendChild(style);
        }
        
        // Mostrar/esconder baseado no scroll
        window.addEventListener('scroll', Utils.throttle(() => {
            if (window.pageYOffset > 300) {
                scrollTopButton.classList.add('visible');
            } else {
                scrollTopButton.classList.remove('visible');
            }
        }, 100));
        
        // Clique para voltar ao topo
        scrollTopButton.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            
            Analytics.sendEvent('scroll_to_top_click');
        });
    }
};

// ========================================
// SISTEMA DE PERFORMANCE
// ========================================

const Performance = {
    /**
     * Inicializar otimizações de performance
     */
    init() {
        this.setupLazyLoading();
        this.setupImageOptimization();
        this.setupPreloading();
        this.monitorPerformance();
    },

    /**
     * Lazy loading para imagens
     */
    setupLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            images.forEach(img => imageObserver.observe(img));
        }
    },

    /**
     * Otimização de imagens
     */
    setupImageOptimization() {
        // Preload de imagens críticas
        const criticalImages = [
            // Adicione URLs de imagens críticas aqui
        ];
        
        criticalImages.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
        });
    },

    /**
     * Preloading de recursos importantes
     */
    setupPreloading() {
        // Preload de fontes
        const fontLinks = [
            'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
        ];
        
        fontLinks.forEach(href => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'style';
            link.href = href;
            document.head.appendChild(link);
        });
    },

    /**
     * Monitoramento de performance
     */
    monitorPerformance() {
        // Core Web Vitals
        if ('PerformanceObserver' in window) {
            // Largest Contentful Paint
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    Analytics.sendEvent('performance_lcp', { 
                        value: entry.startTime,
                        element: entry.element?.tagName 
                    });
                }
            }).observe({ entryTypes: ['largest-contentful-paint'] });
            
            // First Input Delay
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    Analytics.sendEvent('performance_fid', { 
                        value: entry.processingStart - entry.startTime 
                    });
                }
            }).observe({ entryTypes: ['first-input'] });
        }
        
        // Page Load Time
        window.addEventListener('load', () => {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            Analytics.sendEvent('performance_load_time', { value: loadTime });
        });
    }
};

// ========================================
// INICIALIZAÇÃO PRINCIPAL
// ========================================

class WanturApp {
    constructor() {
        this.init();
    }

    async init() {
        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.start());
        } else {
            this.start();
        }
    }

    start() {
        console.log('🚀 WANTUR Landing Page - Iniciando...');
        
        try {
            // Inicializar módulos
            Analytics.init();
            Animations.init();
            UrgencySystem.init();
            FormSystem.init();
            Navigation.init();
            Performance.init();
            
            // Setup de eventos globais
            this.setupGlobalEvents();
            
            // Notificar inicialização completa
            Analytics.sendEvent('app_initialized', {
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            });
            
            console.log('✅ WANTUR Landing Page - Inicializada com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            Analytics.sendEvent('app_error', { error: error.message });
        }
    }

    setupGlobalEvents() {
        // Tratamento de erros globais
        window.addEventListener('error', (e) => {
            Analytics.sendEvent('javascript_error', {
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno
            });
        });

        // Tratamento de promisesas rejeitadas
        window.addEventListener('unhandledrejection', (e) => {
            Analytics.sendEvent('promise_rejection', {
                reason: e.reason?.toString()
            });
        });

        // Resize responsivo
        window.addEventListener('resize', Utils.debounce(() => {
            Analytics.sendEvent('viewport_change', {
                width: window.innerWidth,
                height: window.innerHeight
            });
        }, 300));

        // Visibilidade da página
        document.addEventListener('visibilitychange', () => {
            Analytics.sendEvent('visibility_change', {
                hidden: document.hidden
            });
        });
    }
}

// ========================================
// INICIALIZAÇÃO
// ========================================

// Inicializar aplicação quando o script carregar
new WanturApp();