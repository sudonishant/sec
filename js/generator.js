/*
  ================================================================
  SEC SUPAUL TECHNICAL CLUB - DIGITAL ID CARD GENERATOR
  Generates interactive digital membership pass & QR badge
  ================================================================
*/

document.addEventListener('DOMContentLoaded', () => {
  const idForm = document.getElementById('id-generator-form');
  const previewName = document.getElementById('pass-preview-name');
  const previewRoll = document.getElementById('pass-preview-roll');
  const previewBranch = document.getElementById('pass-preview-branch');
  const previewYear = document.getElementById('pass-preview-year');
  const previewWing = document.getElementById('pass-preview-wing');
  const previewIdNo = document.getElementById('pass-preview-idno');
  const downloadBtn = document.getElementById('download-pass-btn');

  // Input fields
  const nameInput = document.getElementById('id-input-name');
  const rollInput = document.getElementById('id-input-roll');
  const branchSelect = document.getElementById('id-input-branch');
  const yearSelect = document.getElementById('id-input-year');
  const wingSelect = document.getElementById('id-input-wing');

  function updateCardPreview() {
    if (!nameInput) return;

    const name = nameInput.value.trim() || 'AARAV KUMAR';
    const roll = rollInput.value.trim() || '21105126001';
    const branch = branchSelect ? branchSelect.value : 'Computer Science & Engg.';
    const year = yearSelect ? yearSelect.value : '3rd Year (Batch 2023-27)';
    const wing = wingSelect ? wingSelect.value : 'AI & Machine Learning Wing';

    if (previewName) previewName.textContent = name.toUpperCase();
    if (previewRoll) previewRoll.textContent = roll;
    if (previewBranch) previewBranch.textContent = branch;
    if (previewYear) previewYear.textContent = year;
    if (previewWing) previewWing.textContent = wing;

    // Generate unique Pass ID
    const hash = Math.floor(100000 + Math.random() * 900000);
    if (previewIdNo) previewIdNo.textContent = `SEC-TC-2026-${hash}`;
  }

  if (nameInput) nameInput.addEventListener('input', updateCardPreview);
  if (rollInput) rollInput.addEventListener('input', updateCardPreview);
  if (branchSelect) branchSelect.addEventListener('change', updateCardPreview);
  if (yearSelect) yearSelect.addEventListener('change', updateCardPreview);
  if (wingSelect) wingSelect.addEventListener('change', updateCardPreview);

  if (idForm) {
    idForm.addEventListener('submit', (e) => {
      e.preventDefault();
      updateCardPreview();
      alert('🎉 Congratulations! Your SEC Supaul Tech Club Membership Pass has been generated successfully!');
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const cardElement = document.getElementById('id-card-preview-container');
      if (cardElement) {
        window.print();
      }
    });
  }
});
