document.addEventListener('DOMContentLoaded', async () => {
    const response = await fetch('dataset_final.json');
    const data = await response.json();

    // --- 1. EXTRACTION DE DONNÉES AVANCÉE ---
    const statsByRegion = {};
    const countries = {};

    data.forEach(item => {
        const r = item.region || "Inconnu";
        if (r.toLowerCase() === "inconnu") return; // On ignore les données sales

        if (!statsByRegion[r]) {
            statsByRegion[r] = { count: 0, energy: 0, genres: {} };
        }
        statsByRegion[r].count++;
        statsByRegion[r].energy += item.energy || 0;
        
        const g = item.track_genre || "Autres";
        statsByRegion[r].genres[g] = (statsByRegion[r].genres[g] || 0) + 1;
        
        countries[item.country_code] = (countries[item.country_code] || 0) + 1;
    });

    const regionNames = Object.keys(statsByRegion);

    // --- 2. INTERPRÉTATION AUTOMATIQUE ---
    const sortedByCount = [...regionNames].sort((a,b) => statsByRegion[b].count - statsByRegion[a].count);
    const leader = sortedByCount[0];
    const challenger = sortedByCount[1];
    document.getElementById('interpret-geo').innerText = `${leader} domine, suivi de ${challenger}`;

    // --- 3. CONFIGURATION DES COULEURS (Palette cohérente) ---
    const spotifyColors = {
        green: '#1DB954',
        dark: '#191414',
        lightGreen: '#1ed760',
        white: '#ffffff',
        gray: '#b3b3b3'
    };

    // --- G1: RÉPARTITION (Doughnut) ---
    new Chart(document.getElementById('chartRegions'), {
        type: 'doughnut',
        data: {
            labels: regionNames,
            datasets: [{
                data: regionNames.map(r => statsByRegion[r].count),
                backgroundColor: [spotifyColors.green, '#535353', '#ffffff', '#1ed760', '#b3b3b3'],
                hoverOffset: 15
            }]
        },
        options: { 
            cutout: '70%',
            plugins: { legend: { position: 'right', labels: { color: '#b3b3b3', font: { family: 'Inter' } } } }
        }
    });

    // --- G2: ÉNERGIE (Barres Horizontales pour meilleure lecture) ---
    const energyData = regionNames.map(r => ({
        name: r,
        val: (statsByRegion[r].energy / statsByRegion[r].count).toFixed(2)
    })).sort((a,b) => b.val - a.val);

    new Chart(document.getElementById('chartEnergy'), {
        type: 'bar',
        data: {
            labels: energyData.map(d => d.name),
            datasets: [{
                label: 'Score Énergie (0-1)',
                data: energyData.map(d => d.val),
                backgroundColor: spotifyColors.lightGreen,
                borderRadius: 5
            }]
        },
        options: {
            indexAxis: 'y', // Plus lisible pour comparer des noms de régions
            scales: { x: { grid: { display: false }, ticks: { color: '#888' } }, y: { ticks: { color: '#fff' } } }
        }
    });

    // --- G3: TOP GENRES (Stacked Bar avec noms de genres) ---
    // On prend les 5 régions les plus importantes
    const top5Regions = sortedByCount.slice(0, 5);
    const datasets = [
        { label: 'Genre Dominant', data: [], backgroundColor: spotifyColors.green, names: [] },
        { label: 'Second Genre', data: [], backgroundColor: spotifyColors.gray, names: [] },
        { label: 'Troisième Genre', data: [], backgroundColor: '#535353', names: [] }
    ];

    top5Regions.forEach(r => {
        const sortedGenres = Object.entries(statsByRegion[r].genres).sort((a,b) => b[1] - a[1]);
        for(let i=0; i<3; i++) {
            datasets[i].data.push(sortedGenres[i] ? sortedGenres[i][1] : 0);
            datasets[i].names.push(sortedGenres[i] ? sortedGenres[i][0] : 'N/A');
        }
    });

    new Chart(document.getElementById('chartGenresCompare'), {
        type: 'bar',
        data: { labels: top5Regions, datasets: datasets },
        options: {
            scales: { x: { stacked: true }, y: { stacked: true, grid: { color: '#222' } } },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            let genreName = ctx.dataset.names[ctx.dataIndex];
                            return ` ${genreName.toUpperCase()} : ${ctx.raw} titres`;
                        }
                    }
                }
            }
        }
    });
});