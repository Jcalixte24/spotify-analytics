document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('dataset_final.json');
        const data = await response.json();

        // 1. DATA PROCESSING
        const stats = {};
        data.forEach(item => {
            const yr = parseInt(item.year);
            if (yr < 1980 || yr > 2022) return;
            if (!stats[yr]) stats[yr] = { energy: 0, dance: 0, tempo: 0, duration: 0, count: 0 };
            
            stats[yr].energy += (item.energy || 0);
            stats[yr].dance += (item.danceability || 0);
            stats[yr].tempo += (item.tempo || 0);
            
            if(item.duration_fmt) {
                const parts = item.duration_fmt.split(':').map(Number);
                stats[yr].duration += (parts[0] * 60) + parts[1];
            }
            stats[yr].count++;
        });

        const years = Object.keys(stats).sort();
        const energyData = years.map(y => (stats[y].energy / stats[y].count * 100).toFixed(1));
        const danceData = years.map(y => (stats[y].dance / stats[y].count * 100).toFixed(1));
        const tempoData = years.map(y => (stats[y].tempo / stats[y].count).toFixed(0));
        const durationData = years.map(y => (stats[y].duration / stats[y].count).toFixed(0));

        // --- G1 : AREA CHART (Énergie vs Vibe) ---
        new ApexCharts(document.querySelector("#chartEvolutionMain"), {
            series: [{ name: 'Énergie', data: energyData }, { name: 'Dansabilité', data: danceData }],
            chart: { type: 'area', height: 350, toolbar: { show: false } },
            colors: ['#1db954', '#ffffff'],
            dataLabels: { enabled: false }, // SUPPRIME LES DONNÉES SUR LES COURBES
            stroke: { curve: 'smooth', width: 3 },
            fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.1 } },
            xaxis: { categories: years, labels: { style: { colors: '#888' } } },
            yaxis: { title: { text: 'Score %', style: { color: '#888' } }, labels: { style: { colors: '#888' } } },
            legend: { show: true, position: 'top', labels: { colors: '#fff' } }, // GARDE LA LÉGENDE
            theme: { mode: 'dark' }
        }).render();

        // --- G2 : TEMPO (Step Line) ---
        new ApexCharts(document.querySelector("#chartTempoStep"), {
            series: [{ name: 'BPM', data: tempoData }],
            chart: { type: 'line', height: 300, toolbar: { show: false } },
            colors: ['#1db954'],
            dataLabels: { enabled: false }, // SUPPRIME LES DONNÉES SUR LES COURBES
            stroke: { curve: 'stepline', width: 4 },
            xaxis: { categories: years, labels: { style: { colors: '#888' } } },
            yaxis: { title: { text: 'BPM', style: { color: '#888' } }, labels: { style: { colors: '#888' } } },
            theme: { mode: 'dark' }
        }).render();

        // --- G3 : DURÉE (Area avec annotation) ---
        new ApexCharts(document.querySelector("#chartDurationArea"), {
            series: [{ name: 'Secondes', data: durationData }],
            chart: { type: 'area', height: 300, toolbar: { show: false } },
            colors: ['#ff4444'],
            dataLabels: { enabled: false }, // SUPPRIME LES DONNÉES SUR LES COURBES
            stroke: { curve: 'smooth', width: 3 },
            fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0 } },
            xaxis: { categories: years, labels: { style: { colors: '#888' } } },
            yaxis: { 
                labels: { 
                    formatter: (val) => `${Math.floor(val/60)}:${(val%60).toString().padStart(2,'0')}`,
                    style: { colors: '#888' } 
                }
            },
            annotations: {
                yaxis: [{
                    y: 180,
                    borderColor: '#1db954',
                    label: { text: 'Limite 3:00', style: { color: '#fff', background: '#1db954' } }
                }]
            },
            theme: { mode: 'dark' }
        }).render();

    } catch (err) { console.error(err); }
});