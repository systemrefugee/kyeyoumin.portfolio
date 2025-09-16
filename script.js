document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById('project-grid');
  const filterBox = document.getElementById('filter-buttons');

  // 모달
  const modal = document.getElementById('project-modal');
  const overlay = modal.querySelector('.modal-overlay');
  const closeBtn = modal.querySelector('.modal-close');
  const mTitle = document.getElementById('modal-title');
  const mDesc  = document.getElementById('modal-desc');
  const mImages = document.getElementById('modal-images');

  // 고정 네비
  const fixedPrev = document.querySelector('.nav-prev');
  const fixedNext = document.querySelector('.nav-next');

  let projects = [];
  let allTags = new Set(['2025','2024','illustration','typography','silkscreen']);
  let activeFilters = [];       // AND 조건용 선택 태그들
  let sortMode = 'year-desc';   // 기본 정렬
  let currentCardEl = null;     // 모달이 가리키는 현재 카드 DOM

  // JSON 로드
  try {
    const res = await fetch('projects.json', { cache: 'no-store' });
    projects = await res.json();
    projects.forEach(p => (p.tags || []).forEach(t => allTags.add(t)));
  } catch (e) {
    console.error('projects.json을 불러오지 못했습니다', e);
  }

  // 정렬된 프로젝트 목록 반환
  function getSortedProjects() {
    const arr = projects.map((p,i) => ({...p, _index:i}));
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
      // Fisher–Yates
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
        <option value="year-asc"  ${sortMode==='year-asc'?'selected':''}>Earliest</option>
        <option value="year-desc" ${sortMode==='year-desc'?'selected':''}>Latest</option>
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
  function renderProjects() {
    const list = getSortedProjects();
    grid.innerHTML = list.map((p, i) => `
      <div class="project"
           data-index="${p._index}"
           data-tags="${(p.tags||[]).join(' ')}"
           data-title="${escapeHtml(p.title)}"
            data-desc-en="${escapeHtml(p.descEn || '')}"
            data-desc-ko="${escapeHtml(p.descKo || '')}"
           data-images="${(p.images || []).map(escapeHtml).join(',')}">
        <div class="thumbnail-box">
          <img src="${escapeHtml(p.thumb)}" alt="${escapeHtml(p.title)} thumbnail">
        </div>
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.descShort || '')}</p>
        <div class="tag-list">
          ${(p.tags||[]).map(t => `<div class="tag" data-filter="${t}">${t}</div>`).join('')}
        </div>
      </div>
    `).join('');
  }

  // AND 필터 적용 (연도는 동시에 하나만)
  function applyFilters() {
    const cards = grid.querySelectorAll('.project');
    cards.forEach(card => {
      const cardTags = (card.dataset.tags || '').split(' ').filter(Boolean);
      const visible = activeFilters.length === 0 || activeFilters.every(f => cardTags.includes(f));
      card.classList.toggle('hidden', !visible);
    });

    // 버튼 상태
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
        // 기존 선택된 연도 제거 후 이 연도만 토글
        const had = activeFilters.includes(t);
        activeFilters = activeFilters.filter(f => !/^\d+$/.test(f));
        if (!had) activeFilters.push(t);
      } else {
        // 일반 태그는 AND 토글
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
    applyFilters(); // 정렬 후 필터 유지
  });

  // 카드 내부 태그 클릭 → 그 태그 "단독 선택"
  grid.addEventListener('click', (e) => {
    const tagBtn = e.target.closest('.tag[data-filter]');
    if (tagBtn) {
      const t = tagBtn.dataset.filter;
      activeFilters = [t];       // 단독
      renderFilters();           // 버튼 UI 새로 그림
      renderProjects();          // 정렬 유지하며 다시 그림
      applyFilters();            // 필터 적용
      e.stopPropagation();
      return;
    }
  });

  // 모달 열기/닫기
function openModalForCard(cardEl) {
  currentCardEl = cardEl;

  const title = cardEl.dataset.title || '';
  const descEn = cardEl.dataset.descEn || '';
  const descKo = cardEl.dataset.descKo || '';
  const imgs = (cardEl.dataset.images || '').split(',').filter(Boolean).map(s => s.trim());


  mTitle.textContent = title;

  // 설명 2열
  const modalDesc = document.getElementById('modal-desc');
  modalDesc.innerHTML = `
    <div class="modal-desc-2col">
      <div class="desc-col en">${descEn || ''}</div>
      <div class="desc-col ko">${descKo || ''}</div>
    </div>
  `;

  // 모드 초기화
  mImages.className = 'modal-images';  // 기존 클래스 리셋

if (imgs.length > 6) {
  // 버튼 전용 캐러셀(translateX) 마크업
  mImages.innerHTML = `
    <div class="carousel">
      <div class="carousel-viewport">
        <div class="carousel-track">
          ${imgs.map(src => `
            <div class="carousel-slide">
              <img src="${src}" alt="${title}">
            </div>
          `).join('')}
        </div>
        <!-- ✅ 모바일에서만 보이는 탭 존(왼/오) -->
        <div class="tap-zone tap-left"  aria-hidden="true"></div>
        <div class="tap-zone tap-right" aria-hidden="true"></div>
      </div>
      <!-- 데스크톱용 화살표(모바일 CSS에서 숨김) -->
      <button class="carousel-prev" aria-label="Previous">←</button>
      <button class="carousel-next" aria-label="Next">→</button>
    </div>
  `;

  const track  = mImages.querySelector('.carousel-track');
  const prev   = mImages.querySelector('.carousel-prev');
  const next   = mImages.querySelector('.carousel-next');
  const slides = Array.from(mImages.querySelectorAll('.carousel-slide'));
  const tapL   = mImages.querySelector('.tap-left');
  const tapR   = mImages.querySelector('.tap-right');

  let slideIndex = 0;
  function goTo(i){
    slideIndex = (i + slides.length) % slides.length;
    window.__slideIndex = slideIndex;   // ← 전역 백업
    track.style.transform = `translateX(${slideIndex * -100}%)`;
  }

  // 데스크톱(보이는 경우) 화살표
  prev && prev.addEventListener('click', () => goTo(slideIndex - 1));
  next && next.addEventListener('click', () => goTo(slideIndex + 1));

  // ✅ 모바일: 화면 왼쪽/오른쪽 절반 탭으로 이전/다음
  const isMobile = window.matchMedia('(max-width: 600px)').matches;
  if (isMobile) {
    tapL.addEventListener('click', () => goTo(slideIndex - 1));
    tapR.addEventListener('click', () => goTo(slideIndex + 1));
  }

  // 시작은 첫 장
  goTo(0);
  document.body.classList.add('carousel-lock');
} else {
  // (≤6장) 2열 그리드 + 모달 내부 스크롤
  mImages.className = 'modal-images grid-2';
  mImages.innerHTML = imgs.map(src => `<img src="${src}" alt="${title}">`).join('');
  document.body.classList.remove('carousel-lock');
}



  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}




  function closeModal() {
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    document.body.classList.remove('carousel-lock'); // ✅ 해제
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
    if (e.target.closest('.tag')) return; // 태그 클릭은 제외
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

  // 초기 렌더
  renderFilters();
  renderProjects();
  applyFilters();
  
  window.addEventListener('resize', () => {
  if (!document.body.classList.contains('modal-open')) return;
  const track = document.querySelector('.carousel-track');
  if (!track) return;
  // 현재 transform에서 인덱스 추정하기보다, 우리가 관리하던 slideIndex를 쓰는 게 베스트.
  // slideIndex를 전역/상위 스코프로 빼서 참조 가능하면:
  if (window.__slideIndex != null) {
    track.style.transform = `translateX(${window.__slideIndex * -100}%)`;
  }
  });
const aboutToggle = document.getElementById('about-toggle');
const aboutContent = document.getElementById('about-content');
const mqlMobile = window.matchMedia('(max-width: 768px)');

// 1. 페이지 로드 시, 우선 전환(transition) 효과를 막는 클래스를 body에 추가
  document.body.classList.add('disable-transition');

  // 초기 상태 설정 함수
  function setAboutInitialState() {
    if (!aboutToggle || !aboutContent) return;

    if (mqlMobile.matches) {
      // 모바일: 닫힘 상태가 기본
      aboutToggle.setAttribute('aria-expanded', 'false');
      aboutContent.classList.remove('open');
    } else {
      // 데스크탑: 열림 상태가 기본
      aboutToggle.setAttribute('aria-expanded', 'false');
      aboutContent.classList.remove('open'); // 데스크탑에서는 open 클래스도 추가
    }
  }

  // 2. 애니메이션 없이 초기 상태를 먼저 설정
  setAboutInitialState();
  mqlMobile.addEventListener('change', setAboutInitialState);

  // 3. 아주 잠시 후(브라우저가 초기 상태를 그린 후), 전환 효과 클래스를 제거
  setTimeout(() => {
    document.body.classList.remove('disable-transition');
  }, 50); // 지연 시간을 50ms(0.05초)로 줄여 체감 지연 없앰

  // 클릭 이벤트 리스너
  if (aboutToggle && aboutContent) {
    aboutToggle.addEventListener('click', () => {
      const isExpanded = aboutToggle.getAttribute('aria-expanded') === 'true';
      aboutToggle.setAttribute('aria-expanded', !isExpanded);
      aboutContent.classList.toggle('open', !isExpanded);
    });
  }
});
