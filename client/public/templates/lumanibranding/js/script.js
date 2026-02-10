document.addEventListener('DOMContentLoaded', function () {
    const track = document.querySelector('.slider-track');
    // Checa se o 'track' existe na página antes de continuar
    if (!track) {
        return;
    }

    const slides = Array.from(track.children);
    const nextButton = document.querySelector('.next-arrow');
    const prevButton = document.querySelector('.prev-arrow');
    const dotsNav = document.querySelector('.slider-dots');

    // Largura de cada slide, conforme definido no CSS
    const slideWidth = 123;
    let currentIndex = 0;

    // Gera os pontos de navegação
    slides.forEach((slide, index) => {
        const dot = document.createElement('button');
        dot.classList.add('slider-dot');
        if (index === 0) {
            dot.classList.add('active');
        }
        dotsNav.appendChild(dot);

        dot.addEventListener('click', e => {
            currentIndex = index;
            updateSliderPosition();
        });
    });

    const dots = Array.from(dotsNav.children);

    // Função para mover o slide
    const moveToSlide = (newIndex) => {
        // Limita o movimento para não passar do último slide visível
        if (newIndex > slides.length - 3) {
            newIndex = slides.length - 3;
        }
        if (newIndex < 0) {
            newIndex = 0;
        }

        track.style.transform = 'translateX(-' + slideWidth * newIndex + 'px)';
        currentIndex = newIndex;
        updateDots();
    };

    // Função para atualizar qual ponto está ativo
    const updateDots = () => {
        dots.forEach(dot => dot.classList.remove('active'));
        // O ponto ativo corresponde ao primeiro slide visível
        if (dots[currentIndex]) {
            dots[currentIndex].classList.add('active');
        }
    };

    // Event Listeners para as setas
    nextButton.addEventListener('click', e => {
        moveToSlide(currentIndex + 1);
    });

    prevButton.addEventListener('click', e => {
        moveToSlide(currentIndex - 1);
    });

    // Função para atualizar tudo (caso os pontos sejam clicados)
    const updateSliderPosition = () => {
        moveToSlide(currentIndex);
    };
});

// ========= LÓGICA DO FAQ (ACORDEÃO) =========
document.addEventListener('DOMContentLoaded', function () {
    const accordionItems = document.querySelectorAll('.accordion-item');

    // Checa se existe algum item de acordeão antes de rodar o código
    if (accordionItems.length > 0) {
        accordionItems.forEach(item => {
            const header = item.querySelector('.accordion-header');

            header.addEventListener('click', () => {
                // Checa se o item clicado já está ativo
                const isActive = item.classList.contains('active');

                // Primeiro, remove a classe 'active' de todos os itens
                accordionItems.forEach(otherItem => {
                    otherItem.classList.remove('active');
                });

                // Se o item clicado não estava ativo, torna-o ativo
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        });
    }
});

// ========= LÓGICA DO POPUP DE DOAÇÃO =========
document.addEventListener('DOMContentLoaded', function () {
    const donateButtons = document.querySelectorAll('.donate-button');
    const popupOverlay = document.getElementById('donation-popup-overlay');
    const popupModal = document.getElementById('donation-popup');
    const closeButton = document.getElementById('close-popup-btn');

    // Checa se os elementos do popup existem
    if (popupModal && donateButtons.length > 0) {

        const openPopup = () => {
            popupOverlay.classList.remove('hidden');
            popupModal.classList.remove('hidden');
        };

        const closePopup = () => {
            popupOverlay.classList.add('hidden');
            popupModal.classList.add('hidden');
        };

        // Adiciona evento de clique para todos os botões de doação
        donateButtons.forEach(button => {
            button.addEventListener('click', openPopup);
        });

        // Adiciona evento de clique para fechar
        closeButton.addEventListener('click', closePopup);
        popupOverlay.addEventListener('click', closePopup);
    }
});