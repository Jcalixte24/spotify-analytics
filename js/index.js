document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('dataset_final.json');
        const data = await response.json();

        calculerKPIs(data);
        initInteractiveGenreRace(data);
        afficherDuelADN(data);

    } catch (error) {
        console.error("Erreur de chargement :", error);
    }
});

// --- KPIs ---
function calculerKPIs(data) {
    document.getElementById('total-songs').innerText = data.length.toLocaleString();
    const sacArtistes = new Set();
    data.forEach(item => {
        if (item.artists) {
            item.artists.split(/,|;| feat\. | & /).forEach(nom => sacArtistes.add(nom.trim()));
        }
    });
    document.getElementById('total-artists').innerText = sacArtistes.size.toLocaleString();
    const regions = data.map(item => item.region).filter(r => r);
    const counts = {};
    regions.forEach(r => counts[r] = (counts[r] || 0) + 1);
    document.getElementById('top-region').innerText = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    let totalSec = 0;
    data.forEach(item => {
        if (item.duration_fmt && item.duration_fmt.includes(':')) {
            const parts = item.duration_fmt.split(':');
            totalSec += (parseInt(parts[0]) * 60) + parseInt(parts[1]);
        }
    });
    const moy = totalSec / data.length;
    document.getElementById('avg-duration').innerText = `${Math.floor(moy/60)}:${Math.round(moy%60).toString().padStart(2,'0')}`;
}

// --- COURSE DYNAMIQUE (1980-2022) ---
async function initInteractiveGenreRace(data) {
    const slider = document.getElementById('yearRange');
    const yearText = document.getElementById('yearValue');
    const yearBg = document.getElementById('current-year-bg');
    const playBtn = document.getElementById('playBtn');
    
    let isPlaying = false;
    let playInterval;

    const statsByYear = {};
    for (let yr = 1980; yr <= 2022; yr++) {
        const yearHits = data.filter(d => parseInt(d.year) === yr);
        const genreSums = {};
        const genreCounts = {};

        yearHits.forEach(d => {
            if (d.track_genre) {
                genreSums[d.track_genre] = (genreSums[d.track_genre] || 0) + (d.popularity || 0);
                genreCounts[d.track_genre] = (genreCounts[d.track_genre] || 0) + 1;
            }
        });

        statsByYear[yr] = Object.keys(genreSums)
            .map(genre => ({
                x: genre,
                y: parseFloat((genreSums[genre] / genreCounts[genre]).toFixed(1))
            }))
            .sort((a, b) => b.y - a.y) 
            .slice(0, 10);
    }

    const options = {
        series: [{ name: 'Popularité Moyenne', data: statsByYear[1980] }],
        chart: { type: 'bar', height: 400, animations: { enabled: true, speed: 600 }, toolbar: { show: false } },
        plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 6 } },
        colors: ['#1db954', '#1ed760', '#1aa34a', '#21d366', '#12b8ff', '#535353', '#b3b3b3'],
        xaxis: { max: 100, labels: { style: { colors: '#888' } } },
        yaxis: { labels: { style: { colors: '#fff', fontSize: '13px' }, width: 140 } },
        legend: { show: false },
        theme: { mode: 'dark' }
    };

    const raceChart = new ApexCharts(document.querySelector("#genre-race-chart"), options);
    await raceChart.render();

    const updateYear = (yr) => {
        const newData = statsByYear[yr] || [];
        yearText.innerText = yr;
        yearBg.innerText = yr;
        raceChart.updateSeries([{ data: newData }]);
    };

    slider.addEventListener('input', (e) => {
        if(isPlaying) stopAutoPlay();
        updateYear(e.target.value);
    });

    const stopAutoPlay = () => { clearInterval(playInterval); isPlaying = false; playBtn.innerText = "▶"; };

    playBtn.addEventListener('click', () => {
        if (isPlaying) stopAutoPlay();
        else {
            isPlaying = true; playBtn.innerText = "⏸";
            playInterval = setInterval(() => {
                let nxt = parseInt(slider.value) + 1;
                if (nxt > 2022) { stopAutoPlay(); return; }
                slider.value = nxt; updateYear(nxt);
            }, 1200);
        }
    });
}

function afficherDuelADN(data) {
    const getAvg = (arr, key, factor = 100) => 
        (arr.reduce((a, b) => a + (b[key] || 0), 0) / (arr.length || 1) * factor);

    const debut80s = data.filter(d => parseInt(d.year) === 1980);
    const actuel2022 = data.filter(d => parseInt(d.year) === 2022);
    const metrics = ['danceability', 'energy', 'popularity'];
    
    new ApexCharts(document.querySelector("#comparison-bar-chart"), {
        series: [
            { name: 'Année 1980', data: metrics.map(m => getAvg(debut80s, m, m === 'popularity' ? 1 : 100).toFixed(1)) },
            { name: 'Année 2022', data: metrics.map(m => getAvg(actuel2022, m, m === 'popularity' ? 1 : 100).toFixed(1)) }
        ],
        chart: { type: 'bar', height: 350, toolbar: { show: false } },
        colors: ['#444', '#1db954'],
        plotOptions: { bar: { columnWidth: '45%', borderRadius: 4 } },
        xaxis: { categories: ['Dansabilité', 'Énergie', 'Popularité'], labels: { style: { colors: '#888' } } },
        yaxis: { max: 100, labels: { style: { colors: '#888' } } },
        theme: { mode: 'dark' },
        legend: { position: 'top' }
    }).render();
}