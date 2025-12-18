document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('dataset_final.json');
        const data = await response.json();

        // --- 1. PRÉPARATION DES DONNÉES ---
        const regions = {};
        const countries = {};
        const statsByRegion = {};
        const genreStatsByRegion = {}; // Format: { Region: { Genre: { sum: 0, count: 0 } } }
        const allGenres = new Set();
        let totalDance = 0, highPopCount = 0;

        data.forEach(item => {
            const r = item.region || "Autre";
            if (r.toLowerCase() === "inconnu") return;

            regions[r] = (regions[r] || 0) + 1;
            countries[item.country_code] = (countries[item.country_code] || 0) + 1;

            if(!statsByRegion[r]) statsByRegion[r] = { pop: 0, count: 0 };
            statsByRegion[r].pop += (item.popularity || 0);
            statsByRegion[r].count++;

            const g = item.track_genre || "Autres";
            allGenres.add(g);

            // Collecte pour le Graph 3 (Popularité par genre)
            if(!genreStatsByRegion[r]) genreStatsByRegion[r] = {};
            if(!genreStatsByRegion[r][g]) genreStatsByRegion[r][g] = { sum: 0, count: 0 };
            genreStatsByRegion[r][g].sum += (item.popularity || 0);
            genreStatsByRegion[r][g].count++;

            totalDance += (item.danceability || 0);
            if(item.popularity > 80) highPopCount++;
        });

        // --- 2. MISE À JOUR DES KPI ---
        const sortedCountries = Object.entries(countries).sort((a,b) => b[1] - a[1]);
        document.getElementById('nb-pays').innerText = Object.keys(countries).length;
        document.getElementById('top-pays').innerText = sortedCountries[0] ? sortedCountries[0][0] : "-";
        
      

        const colors = ['#1DB954', '#ffffff', '#535353', '#1ed760', '#b3b3b3'];

        // --- G1 : DOUGHNUT (VOLUME) ---
        new Chart(document.getElementById('chartRegions'), {
            type: 'doughnut',
            data: { labels: Object.keys(regions), datasets: [{ data: Object.values(regions), backgroundColor: colors, borderWidth: 0 }] },
            options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#b3b3b3' } } } }
        });

        // --- G2 : POLAR AREA (QUALITÉ) ---
        const regionNames = Object.keys(statsByRegion);
        const popValues = regionNames.map(r => (statsByRegion[r].pop / statsByRegion[r].count).toFixed(1));

        new Chart(document.getElementById('chartPopularityByRegion'), {
            type: 'polarArea',
            data: { labels: regionNames, datasets: [{ data: popValues, backgroundColor: colors.map(c => c + 'B3'), borderColor: '#121212' }] },
            options: { maintainAspectRatio: false, scales: { r: { ticks: { display: false }, grid: { color: '#333' } } }, plugins: { legend: { position: 'bottom', labels: { color: '#b3b3b3' } } } }
        });

        // --- G3 : GROUPED BARS (POPULARITÉ PAR GENRE) ---
        // On sélectionne les 5 régions les plus importantes en volume pour la comparaison
        const top5Regions = regionNames.slice(0, 5);
        const datasets = [
            { label: 'Top 1 Genre (Pop)', backgroundColor: '#1DB954', data: [], names: [] },
            { label: 'Top 2 Genre (Pop)', backgroundColor: '#ffffff', data: [], names: [] },
            { label: 'Top 3 Genre (Pop)', backgroundColor: '#535353', data: [], names: [] }
        ];

        top5Regions.forEach(r => {
            // Calculer la moyenne de popularité pour chaque genre dans la région
            const genreAverages = Object.entries(genreStatsByRegion[r]).map(([genre, stats]) => ({
                name: genre,
                avg: parseFloat((stats.sum / stats.count).toFixed(1))
            }));

            // Trier par popularité moyenne descendante
            genreAverages.sort((a, b) => b.avg - a.avg);

            for(let i=0; i<3; i++) {
                datasets[i].data.push(genreAverages[i] ? genreAverages[i].avg : 0);
                datasets[i].names.push(genreAverages[i] ? genreAverages[i].name : '');
            }
        });

        new Chart(document.getElementById('chartGenresGrouped'), {
            type: 'bar',
            data: { labels: top5Regions, datasets: datasets },
            options: {
                maintainAspectRatio: false,
                scales: { 
                    y: { 
                        min: 0, 
                        max: 100, 
                        title: { display: true, text: 'Popularité (0-100)', color: '#888' },
                        grid: { color: '#333' }, 
                        ticks: { color: '#888' } 
                    },
                    x: { ticks: { color: '#fff' } }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.dataset.names[ctx.dataIndex].toUpperCase()} : ${ctx.raw} score`
                        }
                    },
                    legend: { labels: { color: '#b3b3b3' } }
                }
            }
        });

    } catch (err) {
        console.error("Erreur détectée : ", err);
    }
});