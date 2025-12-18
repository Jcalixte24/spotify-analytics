document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('dataset_final.json');
        const data = await response.json();

        const regionSelect = document.getElementById('regionSelect');
        const yearSelect = document.getElementById('yearSelect');
        const topList = document.getElementById('topList');

        // Initialisation des filtres (1980-2022)
        const regions = [...new Set(data.map(d => d.region))].filter(r => r && r !== "Inconnu").sort();
        const years = [...new Set(data.map(d => parseInt(d.year)))].filter(y => y >= 1980 && y <= 2022).sort((a,b) => b-a);
        
        regions.forEach(r => regionSelect.add(new Option(r, r)));
        years.forEach(y => yearSelect.add(new Option(y, y)));

        const renderTop = () => {
            const selR = regionSelect.value;
            const selY = yearSelect.value;

            // Filtrage
            let filtered = data.filter(d => {
                const yr = parseInt(d.year);
                const mR = (selR === 'all' || d.region === selR);
                const mY = (selY === 'all' ? (yr >= 1980 && yr <= 2022) : yr.toString() === selY);
                return mR && mY;
            });

            // Tri par popularité décroissante
            filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
            const top50 = filtered.slice(0, 50);

            topList.innerHTML = '';

            if (top50.length === 0) {
                topList.innerHTML = '<div class="no-results">Aucun titre trouvé.</div>';
                return;
            }

            top50.forEach((track, index) => {
                // Gestion de l'image (clé 'image' de ton dataset)
                const coverUrl = track.image && track.image.trim() !== "" 
                                ? track.image 
                                : `https://via.placeholder.com/300/121212/1db954?text=${encodeURIComponent(track.track_genre || 'Music')}`;
                
                // Calcul du BPM et de la dansabilité (en %)
                const bpm = Math.round(track.tempo || 0);
                const dance = Math.round((track.danceability || 0) * 100);

                const card = document.createElement('div');
                card.className = 'track-card';
                card.innerHTML = `
                    <div style="position: relative; overflow: hidden; border-radius: 8px;">
                        <img src="${coverUrl}" class="track-cover" alt="Cover" 
                             onerror="this.onerror=null; this.src='https://via.placeholder.com/300/181818/555?text=No+Cover'">
                        <div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: #1db954; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.8rem;">
                            #${index + 1}
                        </div>
                    </div>
                    
                    <div class="track-info">
                        <h4>${track.track_name || 'Titre inconnu'}</h4>
                        <p style="color: #1db954; font-weight: 500;">${track.artists || 'Artiste inconnu'}</p>
                        
                        <div style="margin-top: 12px; border-top: 1px solid #333; padding-top: 10px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span style="font-size: 0.75rem; color: #888;">Genre</span>
                                <span style="font-size: 0.75rem; color: #fff; text-transform: capitalize;">${track.track_genre || 'N/A'}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span style="font-size: 0.75rem; color: #888;">Tempo</span>
                                <span style="font-size: 0.75rem; color: #fff;">${bpm} BPM</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="font-size: 0.75rem; color: #888;">Dance</span>
                                <span style="font-size: 0.75rem; color: #fff;">${dance}%</span>
                            </div>
                        </div>

                        <div style="margin-top: 12px; background: #282828; height: 4px; border-radius: 2px; overflow: hidden;">
                            <div style="width: ${track.popularity || 0}%; background: #1db954; height: 100%;"></div>
                        </div>
                        <p style="font-size: 0.65rem; color: #555; margin-top: 5px;">Popularité : ${track.popularity || 0}/100</p>
                    </div>
                `;
                topList.appendChild(card);
            });
        };

        [regionSelect, yearSelect].forEach(s => s.addEventListener('change', renderTop));
        renderTop();

    } catch (e) { console.error("Erreur Page Top 50:", e); }
});