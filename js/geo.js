document.addEventListener('DOMContentLoaded', async () => {
    const response = await fetch('dataset_final.json');
    const data = await response.json();

    // --- 1. PRÉPARATION DES DONNÉES ---
    const regions = {};
    const countries = {};
    const statsByRegion = {};
    const genreStatsByRegion = {};

    data.forEach(item => {
        const r = item.region || "Autre";
        const genre = item.track_genre || "Autres";
        
        regions[r] = (regions[r] || 0) + 1;
        countries[item.country_code] = (countries[item.country_code] || 0) + 1;

        if(!statsByRegion[r]) {
            statsByRegion[r] = { pop: 0, energy: 0, dance: 0, count: 0 };
            genreStatsByRegion[r] = {};
        }
        statsByRegion[r].pop += item.popularity || 0;
        statsByRegion[r].energy += item.energy || 0;
        statsByRegion[r].dance += item.danceability || 0;
        statsByRegion[r].count++;

        genreStatsByRegion[r][genre] = (genreStatsByRegion[r][genre] || 0) + 1;
    });

    const regionNames = Object.keys(statsByRegion);
    const colors = ['#1DB954', '#1ed760', '#ffffff', '#535353', '#b3b3b3'];

    // --- 2. MISE À JOUR DES KPI ---
    const sortedCountries = Object.entries(countries).sort((a,b) => b[1] - a[1]);
    document.getElementById('nb-pays').innerText = Object.keys(countries).length;
    document.getElementById('top-pays').innerText = sortedCountries[0][0];
    document.getElementById('part-top-pays').innerText = ((sortedCountries[0][1] / data.length) * 100).toFixed(1) + "%";

    // --- 3. GÉNÉRATION DES 6 GRAPHIQUES ---

    // G1: RÉPARTITION RÉGIONS (Doughnut)
    new Chart(document.getElementById('chartRegions'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(regions),
            datasets: [{ data: Object.values(regions), backgroundColor: colors }]
        },
        options: { plugins: { legend: { position: 'bottom', labels: { color: '#b3b3b3' } } } }
    });

    // G2: TOP 10 PAYS (Horizontal Bar)
    const top10C = sortedCountries.slice(0, 10);
    new Chart(document.getElementById('chartTopCountries'), {
        type: 'bar',
        data: {
            labels: top10C.map(c => c[0]),
            datasets: [{ label: 'Titres', data: top10C.map(c => c[1]), backgroundColor: '#1DB954' }]
        },
        options: { indexAxis: 'y', plugins: { legend: { display: false } } }
    });

    // G3: POPULARITÉ (Line)
    const sortedPop = regionNames
        .map(r => ({ name: r, val: (statsByRegion[r].pop / statsByRegion[r].count).toFixed(1) }))
        .sort((a, b) => b.val - a.val);

    new Chart(document.getElementById('chartPopularity'), {
        type: 'line',
        data: {
            labels: sortedPop.map(d => d.name),
            datasets: [{ label: 'Popularité Moyenne', data: sortedPop.map(d => d.val), borderColor: '#1ed760', tension: 0.3, fill: false }]
        }
    });

    // G4: ÉNERGIE (Vertical Bar)
    const sortedEnergy = regionNames
        .map(r => ({ name: r, val: (statsByRegion[r].energy / statsByRegion[r].count).toFixed(2) }))
        .sort((a, b) => b.val - a.val);

    new Chart(document.getElementById('chartEnergy'), {
        type: 'bar',
        data: {
            labels: sortedEnergy.map(d => d.name),
            datasets: [{ label: 'Énergie', data: sortedEnergy.map(d => d.val), backgroundColor: '#1DB954' }]
        }
    });

    // G5: TOP 3 GENRES PAR RÉGION (Stacked Bar)
    const mainRegions = Object.entries(regions).sort((a,b) => b[1]-a[1]).slice(0, 5).map(r => r[0]);
    const top1Data = [], top2Data = [], top3Data = [];
    const top1Labs = [], top2Labs = [], top3Labs = [];

    mainRegions.forEach(r => {
        const sortedGenres = Object.entries(genreStatsByRegion[r]).sort((a,b) => b[1]-a[1]);
        top1Data.push(sortedGenres[0] ? sortedGenres[0][1] : 0);
        top1Labs.push(sortedGenres[0] ? sortedGenres[0][0] : '');
        top2Data.push(sortedGenres[1] ? sortedGenres[1][1] : 0);
        top2Labs.push(sortedGenres[1] ? sortedGenres[1][0] : '');
        top3Data.push(sortedGenres[2] ? sortedGenres[2][1] : 0);
        top3Labs.push(sortedGenres[2] ? sortedGenres[2][0] : '');
    });

    new Chart(document.getElementById('chartGenresCompare'), {
        type: 'bar',
        data: {
            labels: mainRegions,
            datasets: [
                { label: 'Top 1', data: top1Data, backgroundColor: '#1DB954', genres: top1Labs },
                { label: 'Top 2', data: top2Data, backgroundColor: '#1ed760', genres: top2Labs },
                { label: 'Top 3', data: top3Data, backgroundColor: '#ffffff', genres: top3Labs }
            ]
        },
        options: {
            scales: { x: { stacked: true }, y: { stacked: true } },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.genres[ctx.dataIndex].toUpperCase()} : ${ctx.raw} titres`
                    }
                }
            }
        }
    });

    // G6: DANCEABILITÉ (Radar)
    const sortedDance = regionNames
        .map(r => ({ name: r, val: (statsByRegion[r].dance / statsByRegion[r].count).toFixed(2) }))
        .sort((a, b) => b.val - a.val);

    new Chart(document.getElementById('chartDanceability'), {
        type: 'radar',
        data: {
            labels: sortedDance.map(d => d.name),
            datasets: [{
                label: 'Indice de Danse',
                data: sortedDance.map(d => d.val),
                backgroundColor: 'rgba(29, 185, 84, 0.2)',
                borderColor: '#1DB954',
                pointBackgroundColor: '#1DB954'
            }]
        },
        options: { scales: { r: { min: 0, max: 1, grid: { color: '#333' } } } }
    });
});