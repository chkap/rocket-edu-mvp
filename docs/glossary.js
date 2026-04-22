import './site-header.js';
import { initPage, t } from './lib/i18n.js';

const GLOSSARY_TERMS = [
  { id: 'delta-v', termKey: 'designer_v2.glossary.term.delta_v', bodyKey: 'designer_v2.glossary.body.delta_v', category: 'equation' },
  { id: 'isp', termKey: 'designer_v2.glossary.term.isp', bodyKey: 'designer_v2.glossary.body.isp', category: 'equation' },
  { id: 'twr', termKey: 'designer_v2.glossary.term.twr', bodyKey: 'designer_v2.glossary.body.twr', category: 'performance' },
  { id: 'mr', termKey: 'designer_v2.glossary.term.mr', bodyKey: 'designer_v2.glossary.body.mr', category: 'equation' },
  { id: 'stage', termKey: 'designer_v2.glossary.term.stage', bodyKey: 'designer_v2.glossary.body.stage', category: 'stage' },
  { id: 'booster', termKey: 'designer_v2.glossary.term.booster', bodyKey: 'designer_v2.glossary.body.booster', category: 'stage' },
  { id: 'fairing', termKey: 'designer_v2.glossary.term.fairing', bodyKey: 'designer_v2.glossary.body.fairing', category: 'stage' },
  { id: 'vacuum-isp', termKey: 'designer_v2.glossary.term.vacuum_isp', bodyKey: 'designer_v2.glossary.body.vacuum_isp', category: 'performance' },
  { id: 'sea-level-isp', termKey: 'designer_v2.glossary.term.sea_level_isp', bodyKey: 'designer_v2.glossary.body.sea_level_isp', category: 'performance' },
  { id: 'specific-impulse', termKey: 'designer_v2.glossary.term.specific_impulse', bodyKey: 'designer_v2.glossary.body.specific_impulse', category: 'equation' },
  { id: 'mass-ratio', termKey: 'designer_v2.glossary.term.mass_ratio', bodyKey: 'designer_v2.glossary.body.mass_ratio', category: 'equation' },
  { id: 'burn-time', termKey: 'designer_v2.glossary.term.burn_time', bodyKey: 'designer_v2.glossary.body.burn_time', category: 'performance' },
  { id: 'gravity-loss', termKey: 'designer_v2.glossary.term.gravity_loss', bodyKey: 'designer_v2.glossary.body.gravity_loss', category: 'performance' },
  { id: 'suborbital', termKey: 'designer_v2.glossary.term.suborbital', bodyKey: 'designer_v2.glossary.body.suborbital', category: 'orbit' },
  { id: 'orbit-leo', termKey: 'designer_v2.glossary.term.orbit_leo', bodyKey: 'designer_v2.glossary.body.orbit_leo', category: 'orbit' },
  { id: 'orbit-iss', termKey: 'designer_v2.glossary.term.orbit_iss', bodyKey: 'designer_v2.glossary.body.orbit_iss', category: 'orbit' },
  { id: 'orbit-meo', termKey: 'designer_v2.glossary.term.orbit_meo', bodyKey: 'designer_v2.glossary.body.orbit_meo', category: 'orbit' },
  { id: 'orbit-geo', termKey: 'designer_v2.glossary.term.orbit_geo', bodyKey: 'designer_v2.glossary.body.orbit_geo', category: 'orbit' },
  { id: 'orbit-gto', termKey: 'designer_v2.glossary.term.orbit_gto', bodyKey: 'designer_v2.glossary.body.orbit_gto', category: 'orbit' },
  { id: 'orbit-tli', termKey: 'designer_v2.glossary.term.orbit_tli', bodyKey: 'designer_v2.glossary.body.orbit_tli', category: 'orbit' },
  { id: 'mars-transfer', termKey: 'designer_v2.glossary.term.mars_transfer', bodyKey: 'designer_v2.glossary.body.mars_transfer', category: 'orbit' },
  { id: 'lunar-landing', termKey: 'designer_v2.glossary.term.lunar_landing', bodyKey: 'designer_v2.glossary.body.lunar_landing', category: 'orbit' },
];

function renderGlossaryTable() {
  const tbody = document.getElementById('glossary-tbody');
  if (!tbody) return;

  tbody.innerHTML = GLOSSARY_TERMS.map((term) => {
    const termText = t(term.termKey);
    const bodyText = t(term.bodyKey);
    const categoryText = t(`glossary.category.${term.category}`);
    return `<tr id="${term.id}" data-glossary-row>
      <td class="glossary-term-cell"><strong>${termText}</strong></td>
      <td class="glossary-def-cell">${bodyText}</td>
      <td class="glossary-cat-cell"><span class="glossary-category-badge glossary-cat-${term.category}">${categoryText}</span></td>
    </tr>`;
  }).join('');
}

function bindSearch() {
  const input = document.getElementById('glossary-search');
  if (!input) return;

  input.addEventListener('input', () => {
    const query = input.value.toLowerCase().trim();
    const rows = document.querySelectorAll('#glossary-tbody tr');
    for (const row of rows) {
      const text = row.textContent.toLowerCase();
      row.hidden = query !== '' && !text.includes(query);
    }
  });
}

function init() {
  initPage({
    titleKey: 'glossary.title',
  });

  renderGlossaryTable();
  bindSearch();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
