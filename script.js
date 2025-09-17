document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById('project-grid');
  const filterBox = document.getElementById('filter-buttons');

  // 모달
  const modal = document.getElementById('project-modal');
  const overlay = modal.querySelector('.modal-overlay');
  const closeBtn = modal.querySelector('.modal-close');
  const mTitle = document.getElementById('modal-title');
  const mSubtitle = document.getElementById('modal-subtitle');
  const mDesc  = document.getElementById('modal-desc');
  const mImages = document.getElementById('modal-images');

  // 고정 네비
  const fixedPrev = document.querySelector('.nav-prev');
  const fixedNext = document.querySelector('.nav-next');

  let projects = [];
  let allTags = new Set();
  let activeFilters = [];
  let sortMode = 'order-desc';
  let currentCardEl = null;

  // JSON 로드
  try {
    const res = await fetch('projects.json', { cache: 'no-store' });
    const allProjects = await res.json();
    projects = allProjects.filter(p => p.visible !== false);
    projects.forEach(p => (p.tags || []).forEach(t => allTags.add(t)));
  } catch (e) {
    console.error('projects.json을 불러오지 못했습니다', e);
  }

  // 정렬된 프로젝트 목록 반환
 function getSortedProjects() {
  const arr = projects.map((p,i) => ({...p, _index:i}));
  
  // ✅ 'order' 기준 정렬 로직 추가
  if (sortMode === 'order-asc') {
    return arr.sort((a,b) => (a.order || 0) - (b.order || 0));
  }
  if (sortMode === 'order-desc') {
    return arr.sort((a,b) => (b.order || 0) - (a.order || 0));
  }
  
  // --- 기존 정렬 로직은 그대로 유지 ---
  if (sortMode === 'title-asc') {
    return arr.sort((a,b) => (a.title||'').localeCompare(b.title||''));
  }
  if (sortMode === 'year-asc') {
    return arr.sort((a,b) => (+a.year||0) - (+b.year||0) || (a.title||'').localeCompare(b.title||''));
  }
  if (sortMode === 'year-desc') {
    return arr.sort((a,b) => (+b.year||0) - (+a.year||0) || (a.title||'').localeCompare(b.title||''));
  }
  if (sortMode === 'random') {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  return arr;
}
  // 상단 태그 + 정렬 UI 렌더
  function renderFilters() {
    const tags = Array.from(allTags).sort((a,b) => a.localeCompare(b));
    const buttonsHtml = `<div class="button-group">` +
      ['all', ...tags].map(tag => `
        <button data-filter="${tag}" class="${tag==='all' && activeFilters.length===0 ? 'active' : ''}">
          ${tag === 'all' ? 'All' : tag}
        </button>
      `).join('') +
    `</div>`;

  const sortHtml = `
    <div class="sort-controls">
      <label for="sort-select">Sort</label>
      <select id="sort-select">
        <option value="order-desc" ${sortMode==='order-desc'?'selected':''}>Newest</option>
        <option value="order-asc"  ${sortMode==='order-asc'?'selected':''}>Oldest</option>
        <option value="title-asc" ${sortMode==='title-asc'?'selected':''}>Title A–Z</option>
        <option value="random"    ${sortMode==='random'?'selected':''}>Random</option>
      </select>
    </div>
  `;

    filterBox.innerHTML = buttonsHtml + sortHtml;
  }

  // 카드 렌더
  function escapeHtml(str='') {
    return String(str)
      .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
      .replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }
  
  function createLinks(text) {
  // [텍스트](주소) 패턴을 찾아서 <a> 태그로 바꿔주는 정규식
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  return text.replace(linkRegex, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

  function renderProjects() {
    const list = getSortedProjects();
    grid.innerHTML = list.map((p, i) => `
      <div class="project"
           data-index="${p._index}"
           data-tags="${(p.tags || []).join(' ')}"
           data-title="${escapeHtml(p.title)}"
           data-desc-short="${escapeHtml(p.descShort || '')}"
           data-desc-en="${escapeHtml(p.descEn || '')}"
           data-desc-ko="${escapeHtml(p.descKo || '')}"
           data-images="${(p.images || []).map(escapeHtml).join(',')}"
           data-video-url="${escapeHtml(p.vimeoEmbedUrl || '')}" 
      >
        <div class="thumbnail-box">
          <img src="${escapeHtml(p.thumb)}" alt="${escapeHtml(p.title)} thumbnail" loading="lazy">
        </div>
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.descShort || '')}</p>
        <div class="tag-list">
          ${(p.tags||[]).map(t => `<div class="tag" data-filter="${t}">${t}</div>`).join('')}
        </div>
      </div>
    `).join('');
  }


  // AND 필터 적용
  function applyFilters() {
    const cards = Array.from(grid.querySelectorAll('.project'));
    const visibleCount = cards.filter(card => {
        const cardTags = (card.dataset.tags || '').split(' ').filter(Boolean);
        return activeFilters.length === 0 || activeFilters.every(f => cardTags.includes(f));
    }).length;

    if (activeFilters.length > 0 && visibleCount === 0) {
      const lastClicked = activeFilters[activeFilters.length - 1];
      activeFilters = [lastClicked];
    }
    
    cards.forEach(card => {
      const cardTags = (card.dataset.tags || '').split(' ').filter(Boolean);
      const visible = activeFilters.length === 0 || activeFilters.every(f => cardTags.includes(f));
      card.classList.toggle('hidden', !visible);
    });

    filterBox.querySelectorAll('button[data-filter]').forEach(btn => {
      const t = btn.dataset.filter;
      if (t === 'all') {
        btn.classList.toggle('active', activeFilters.length === 0);
      } else {
        btn.classList.toggle('active', activeFilters.includes(t));
      }
    });
  }

  // 상단 태그 클릭
  filterBox.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-filter]');
    if (!btn) return;
    const t = btn.dataset.filter;

    if (t === 'all') {
      activeFilters = [];
    } else {
      const isYear = /^\d+$/.test(t);
      if (isYear) {
        const had = activeFilters.includes(t);
        activeFilters = activeFilters.filter(f => !/^\d+$/.test(f));
        if (!had) activeFilters.push(t);
      } else {
        if (activeFilters.includes(t)) activeFilters = activeFilters.filter(x => x !== t);
        else activeFilters.push(t);
      }
    }
    applyFilters();
  });

  // 정렬 변경
  filterBox.addEventListener('change', (e) => {
    const sel = e.target.closest('#sort-select');
    if (!sel) return;
    sortMode = sel.value;
    renderProjects();
    applyFilters();
  });

  // 카드 내부 태그 클릭
  grid.addEventListener('click', (e) => {
    const tagBtn = e.target.closest('.tag[data-filter]');
    if (tagBtn) {
      const t = tagBtn.dataset.filter;
      activeFilters = [t];
      renderFilters();
      applyFilters();
      e.stopPropagation();
      if (window.innerWidth <= 768) {
        const archiveSection = document.getElementById('about');
        if (archiveSection) {
          archiveSection.scrollIntoView();
        }
      }
      return;
    }
  });

  // 모달 열기/닫기

function openModalForCard(cardEl) {
  currentCardEl = cardEl;

  const title = cardEl.dataset.title || '';
  const descShort = cardEl.dataset.descShort || '';
  const descEn = cardEl.dataset.descEn || '';
  const descKo = cardEl.dataset.descKo || '';
  const imgs = (cardEl.dataset.images || '').split(',').filter(Boolean).map(s => s.trim());
  const videoUrl = cardEl.dataset.videoUrl || '';

  mTitle.textContent = title;
  mSubtitle.textContent = descShort;
  mSubtitle.style.display = descShort ? 'block' : 'none';

    mDesc.innerHTML = `
    <div class="modal-desc-2col">
      <div class="desc-col en">${createLinks(descEn)}</div>
      <div class="desc-col ko">${createLinks(descKo)}</div>
    </div>
  `;

  // --- 비디오와 이미지를 합쳐서 표시하는 새로운 로직 ---
  
  // 1. 비디오와 이미지를 하나의 콘텐츠 목록으로 만듭니다.
  const contentItems = [];
  if (videoUrl) {
    contentItems.push({ type: 'video', url: videoUrl });
  }
  imgs.forEach(imgUrl => {
    contentItems.push({ type: 'image', url: imgUrl });
  });

  // 2. 콘텐츠 개수에 따라 그리드 또는 캐러셀로 렌더링합니다.
  mImages.className = 'modal-images'; // 클래스 초기화

  if (contentItems.length > 6) {
    // 캐러셀 모드
    const slidesHtml = contentItems.map(item => {
      if (item.type === 'video') {
        return `<div class="carousel-slide"><div class="video-container"><iframe src="${item.url}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div></div>`;
      } else {
        return `<div class="carousel-slide"><img src="${item.url}" alt="${title}"></div>`;
      }
    }).join('');

    mImages.innerHTML = `
      <div class="carousel">
        <div class="carousel-viewport"><div class="carousel-track">${slidesHtml}</div>
          <div class="tap-zone tap-left" aria-hidden="true"></div><div class="tap-zone tap-right" aria-hidden="true"></div>
        </div>
        <button class="carousel-prev" aria-label="Previous">←</button><button class="carousel-next" aria-label="Next">→</button>
      </div>`;
    
    // 캐러셀 이벤트 리스너 설정 (기존과 동일)
    const track = mImages.querySelector('.carousel-track'), prev = mImages.querySelector('.carousel-prev'), next = mImages.querySelector('.carousel-next'), slides = Array.from(mImages.querySelectorAll('.carousel-slide')), tapL = mImages.querySelector('.tap-left'), tapR = mImages.querySelector('.tap-right');
    let slideIndex = 0;
    const goTo = i => { slideIndex = (i + slides.length) % slides.length; window.__slideIndex = slideIndex; track.style.transform = `translateX(${slideIndex * -100}%)`; };
    prev && prev.addEventListener('click', () => goTo(slideIndex - 1));
    next && next.addEventListener('click', () => goTo(slideIndex + 1));
    if (window.matchMedia('(max-width: 600px)').matches) {
        tapL.addEventListener('click', () => goTo(slideIndex - 1));
        tapR.addEventListener('click', () => goTo(slideIndex + 1));
    }
    goTo(0);

  } else {
    // 그리드 모드
    mImages.className = 'modal-images grid-2';
    const gridHtml = contentItems.map(item => {
      if (item.type === 'video') {
        return `<div class="video-container"><iframe src="${item.url}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
      } else {
        return `<img src="${item.url}" alt="${title}">`;
      }
    }).join('');
    mImages.innerHTML = gridHtml;
  }

  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

  function closeModal() {
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    currentCardEl = null;
  }
  overlay.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (!document.body.classList.contains('modal-open')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft')  openSibling(-1);
    if (e.key === 'ArrowRight') openSibling(1);
  });

  // 카드 클릭 → 모달
  grid.addEventListener('click', (e) => {
    if (e.target.closest('.tag')) return;
    const card = e.target.closest('.project');
    if (!card) return;
    openModalForCard(card);
  });

  // 현재 필터 결과 내에서 이전/다음
  function getVisibleCards() {
    return Array.from(grid.querySelectorAll('.project:not(.hidden)'));
  }
  function openSibling(delta) {
    const visible = getVisibleCards();
    if (!visible.length || !currentCardEl) return;
    const idx = visible.indexOf(currentCardEl);
    if (idx === -1) return;
    const next = visible[(idx + delta + visible.length) % visible.length];
    openModalForCard(next);
  }

  // 고정 네비 버튼
  if (fixedPrev) fixedPrev.addEventListener('click', () => openSibling(-1));
  if (fixedNext) fixedNext.addEventListener('click', () => openSibling(1));
  
  // About 토글 로직
  const aboutToggle = document.getElementById('about-toggle');
  const aboutContent = document.getElementById('about-content');
  if (aboutToggle && aboutContent) {
    document.body.classList.add('disable-transition');
    const mqlMobile = window.matchMedia('(max-width: 768px)');
    const setAboutInitialState = () => {
      const isExpanded = !mqlMobile.matches;
      aboutToggle.setAttribute('aria-expanded', isExpanded);
      aboutContent.classList.toggle('open', isExpanded);
    };
    setAboutInitialState();
    mqlMobile.addEventListener('change', setAboutInitialState);
    setTimeout(() => document.body.classList.remove('disable-transition'), 50);
    aboutToggle.addEventListener('click', () => {
      const isExpanded = aboutToggle.getAttribute('aria-expanded') === 'true';
      aboutToggle.setAttribute('aria-expanded', !isExpanded);
      aboutContent.classList.toggle('open', !isExpanded);
    });
  }

  // 초기 렌더
  renderFilters();
  renderProjects();
  applyFilters();
});