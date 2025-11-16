async function loadStories() {
    const res = await fetch('/stories');
    return res.json();
}
export default { loadStories };