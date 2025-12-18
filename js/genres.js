document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('dataset_final.json');
        const data = await response.json();

        const regionSelect = document.getElementById('regionSelect');
        const yearSelect = document.getElementById('yearSelect');

        // 1. FILTRAGE INITIAL & REMPLISSAGE SLICERS
        const regions = [...new Set(data.map(d => d.region))].filter(r => r && r !== "Inconnu").sort();
        
        // On limite strictement de 1980 à 2022
        const years = [...new Set(data.map(d => parseInt(d.year)))]
            .filter(y => y >= 1980 && y <= 2022)
            .sort((a,b) => b-a);

        regions.forEach(r => regionSelect.add(new Option(r, r)));
        years.forEach(y => yearSelect.add(new Option(y, y)));

        let radarChart, heatmapChart, treemapChart;

        const render = () => {
            const selRegion = regionSelect.value;
            const selYear = yearSelect.value;

            const filtered = data.filter(d => {
                const yr = parseInt(d.year);
                const matchRegion = (selRegion === 'all' || d.region === selRegion);
                const matchYear = (selYear === 'all' ? (yr >= 1980 && yr <= 2022) : yr.toString() === selYear);
                const cleanGenre = d.track_genre && d.track_genre.toLowerCase() !== "inconnu";
                return matchRegion && matchYear && cleanGenre;
            });

            const stats = {};
            filtered.forEach(d => {
                const g = d.track_genre;
                if(!stats[g]) stats[g] = { count:0, pop:0, dance:0, energy:0 };
                stats[g].count++;
                stats[g].pop += d.popularity || 0;
                stats[g].dance += d.danceability || 0;
                stats[g].energy += d.energy || 0;
            });

            const genreArr = Object.keys(stats).map(g => ({
                name: g.toUpperCase(),
                pop: stats[g].pop / stats[g].count,
                dance: (stats[g].dance / stats[g].count) * 100,
                energy: (stats[g].energy / stats[g].count) * 100,
                count: stats[g].count
            })).sort((a,b) => b.pop - a.pop);

            // --- G1 : RADAR (MAX VISIBILITÉ) ---
            const radarOpts = {
                series: genreArr.slice(0, 3).map(g => ({ name: g.name, data: [g.pop.toFixed(0), g.dance.toFixed(0), g.energy.toFixed(0)] })),
                chart: { type: 'radar', height: 450, toolbar: {show:false} },
                colors: ['#1db954', '#ffffff', '#535353'],
                xaxis: { 
                    categories: ['POPULARITÉ', 'DANSABILITÉ', 'ÉNERGIE'],
                    labels: { style: { colors: '#fff', fontSize: '12px', fontWeight: 600 } }
                },
                yaxis: { show: false, max: 100 },
                theme: { mode: 'dark' },
                stroke: { width: 4 }, // Lignes très épaisses
                fill: { opacity: 0.3 },
                markers: { size: 5 }
            };
            if(radarChart) radarChart.destroy();
            radarChart = new ApexCharts(document.querySelector("#radarGenre"), radarOpts);
            radarChart.render();

            // --- G2 : HEATMAP (Épuré) ---
            const heatmapOpts = {
                series: [{ name: 'Popularité', data: genreArr.slice(0, 10).map(g => ({ x: g.name, y: g.pop.toFixed(0) })) }],
                chart: { type: 'heatmap', height: 350, toolbar: {show:false} },
                colors: ["#1db954"],
                theme: { mode: 'dark' },
                dataLabels: { enabled: true }
            };
            if(heatmapChart) heatmapChart.destroy();
            heatmapChart = new ApexCharts(document.querySelector("#heatmapGenre"), heatmapOpts);
            heatmapChart.render();

            // --- G3 : TREEMAP (Poids du marché) ---
            const treemapOpts = {
                series: [{ data: genreArr.slice(0, 20).map(g => ({ x: g.name, y: g.count })) }],
                chart: { type: 'treemap', height: 300, toolbar: {show:false} },
                colors: ['#1db954'],
                theme: { mode: 'dark' },
                plotOptions: { treemap: { distributed: true } }
            };
            if(treemapChart) treemapChart.destroy();
            treemapChart = new ApexCharts(document.querySelector("#treemapGenre"), treemapOpts);
            treemapChart.render();
        };

        [regionSelect, yearSelect].forEach(s => s.addEventListener('change', render));
        render();

    } catch (e) { console.error(e); }
});