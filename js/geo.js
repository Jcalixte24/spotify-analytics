document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. CHARGEMENT (Toujours pareil)
    const response = await fetch('dataset_final.json');
    const data = await response.json();

    // 2. CALCULS
    analyserGeo(data);
});

function analyserGeo(data) {
    
    // --- ETAPE A : COMPTER LES PAYS (Méthode du Carnet de Vote) ---
    let compteurPays = {};

    data.forEach(item => {
        // On récupère le code pays (ex: "US", "FR")
        // S'il n'y a pas de code, on met "Inconnu"
        let code = item.country_code || "Inconnu";

        if (compteurPays[code]) {
            compteurPays[code]++; // +1 si existe déjà
        } else {
            compteurPays[code] = 1; // Initialisation
        }
    });

    // --- ETAPE B : KPI (Chiffres) ---
    
    // 1. Nombre de pays différents (nombre de lignes dans mon carnet)
    const listePays = Object.keys(compteurPays);
    document.getElementById('nb-pays').innerText = listePays.length;

    // 2. Trouver le Top Pays (Le gagnant)
    let topPays = "";
    let maxVotes = 0;

    for (const pays in compteurPays) {
        if (compteurPays[pays] > maxVotes) {
            maxVotes = compteurPays[pays];
            topPays = pays;
        }
    }
    document.getElementById('top-pays').innerText = topPays;

    // 3. Calculer le pourcentage de dominance (Votes du gagnant / Total chansons)
    let pourcentage = (maxVotes / data.length) * 100;
    document.getElementById('part-top-pays').innerText = pourcentage.toFixed(1) + " %";


    // --- ETAPE C : GRAPHIQUE (Top 10) ---

    // 1. Transformer le carnet en liste triée pour le graphique
    // On veut passer de {US: 500, FR: 20} à une liste ordonnée
    let listeTriee = Object.entries(compteurPays) // Crée des paires [ ["US", 500], ["FR", 20] ]
        .sort((a, b) => b[1] - a[1]) // Trie du plus grand au plus petit
        .slice(0, 10); // Garde seulement les 10 premiers

    // On sépare les noms et les valeurs pour ApexCharts
    let labels = listeTriee.map(item => item[0]); // ["US", "GB", "CA"...]
    let valeurs = listeTriee.map(item => item[1]); // [500, 120, 50...]

    // 2. Configuration du Graphique (Bar Chart Horizontal)
    var options = {
        series: [{
            name: 'Nombre de Hits',
            data: valeurs
        }],
        chart: {
            type: 'bar', // Barres horizontales c'est mieux pour lire les noms
            height: 350,
            background: 'transparent',
            toolbar: { show: false }
        },
        plotOptions: {
            bar: {
                borderRadius: 4,
                horizontal: true, // IMPORTANT : Barres couchées
            }
        },
        colors: ['#1db954'],
        dataLabels: { enabled: false }, // Cache les chiffres sur les barres pour faire propre
        xaxis: {
            categories: labels,
            labels: { style: { colors: '#888' } }
        },
        yaxis: {
            labels: { style: { colors: '#fff' } } // Pays en blanc
        },
        grid: {
            borderColor: '#333'
        },
        theme: { mode: 'dark' }
    };

    var chart = new ApexCharts(document.querySelector("#geo-chart"), options);
    chart.render();
}