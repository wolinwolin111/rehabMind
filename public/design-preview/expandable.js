if (document.body.classList.contains('refined')) {
  const chevron = '<svg class="expand-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  function expandable(card, heading, contents, initiallyOpen = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'expand-heading';
    button.append(heading);
    button.insertAdjacentHTML('beforeend', chevron);
    button.setAttribute('aria-expanded', String(initiallyOpen));
    const expansion = document.createElement('div');
    expansion.className = 'expand-region' + (initiallyOpen ? ' is-open' : '');
    expansion.inert = !initiallyOpen;
    const clip = document.createElement('div');
    clip.className = 'expand-clip';
    const body = document.createElement('div');
    body.className = 'expand-content';
    body.append(...contents);
    clip.append(body);
    expansion.append(clip);
    card.replaceChildren(button, expansion);
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      expansion.classList.toggle('is-open', open);
      expansion.inert = !open;
    });
  }
  const symptoms = document.createElement('article');
  symptoms.className = 'preview-symptoms';
  const symptomHeading = document.createElement('span');
  symptomHeading.innerHTML = '<strong>患者与症状信息</strong><small>可选填写</small>';
  const symptomBody = document.createElement('div');
  symptomBody.className = 'preview-symptom-options';
  symptomBody.textContent = '正在载入…';
  expandable(symptoms, symptomHeading, [symptomBody]);
  document.querySelector('.categories').before(symptoms);
  fetch('/api/meta').then(response => response.json()).then(meta => {
    symptomBody.replaceChildren();
    const title = document.createElement('h4'); title.textContent = '症状线索'; symptomBody.append(title);
    meta.contexts.filter(rule => rule.rule_id.startsWith('KNEE-') && rule.rule_type === 'SYMPTOM').slice(0, 6).forEach(rule => {
      const label = document.createElement('label');
      const input = document.createElement('input'); input.type = 'checkbox';
      const text = document.createElement('span'); text.textContent = rule.source_context;
      label.append(input, text); symptomBody.append(label);
    });
  }).catch(() => { symptomBody.textContent = '暂时无法载入'; });
  const card = document.querySelector('.muscle-card');
  const title = card.querySelector('.muscle-title');
  expandable(card, title, [...card.children].filter(node => node !== title), true);
  const related = document.createElement('section');
  related.className = 'preview-related';
  related.innerHTML = '<header>其他相关项目 <span>2 项</span></header>';
  card.after(related);
  document.querySelectorAll('.other').forEach(old => {
    const replacement = document.createElement('article');
    replacement.className = 'other expandable-other';
    const label = document.createElement('span');
    label.textContent = old.querySelector('summary').textContent.trim();
    expandable(replacement, label, [...old.querySelectorAll('p')]);
    related.append(replacement);
    old.remove();
  });
}
