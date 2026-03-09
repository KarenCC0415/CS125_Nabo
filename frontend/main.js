function goSearch(query) {
    if (!query.trim()) return;
    window.location.href = `results.html?q=${encodeURIComponent(query.trim())}`;
}



document.getElementById('heroCta').addEventListener('click', () => {
  goSearch(document.getElementById('heroSearch').value);
});



document.getElementById('heroSearch').addEventListener('keydown', e => {
  if (e.key === 'Enter') goSearch(e.target.value);
});



// Clicking a pill searches directly
document.querySelectorAll('.pill[data-q]').forEach(pill => {
  pill.addEventListener('click', () => goSearch(pill.dataset.q));
});