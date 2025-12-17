document.addEventListener('DOMContentLoaded', async () => {

    // --- 1. CHARGEMENT DU FICHIER JSON ---
    const response = await fetch('dataset_final.json'); 
    // On transforme la réponse en données utilisables 
    const musicData = await response.json();

    // --- 2. LANCEMENT DES ANALYSES ---
    calculerKPIs(musicData);
    afficherGraphique(musicData);

});

// --- PARTIE KPI (Chiffres clés) ---
function calculerKPIs(data) {
    // 1. Total Chansons
    document.getElementById('total-songs').innerText = data.length.toLocaleString();

    // --- 2. Artistes Uniques ---
    const sacArtistes = new Set(); // "Set" supprime automatiquement les doublons

    data.forEach(item => {
        if (item.artists) {
            // On sépare les noms s'il y a une virgule, un point-virgule, "feat" ou "&"
            const listeNoms = item.artists.split(/,|;| feat\. | & /);

            listeNoms.forEach(nom => {
                //enlève les espaces inutiles autour du nom avant de l'ajouter
                sacArtistes.add(nom.trim());
            });
        }
    });
    document.getElementById('total-artists').innerText = sacArtistes.size.toLocaleString();
    // 3. Top Région 
    const regions = data.map(item => item.region);
    document.getElementById('top-region').innerText = trouverPlusFrequent(regions);
    // 4. Durée Moyenne 
    let totalSecondes = 0;
    
    data.forEach(item => {
        if (item.duration_fmt && item.duration_fmt.includes(':')) {
            const parts = item.duration_fmt.split(':'); 
            const minutes = parseInt(parts[0]);
            const secondes = parseInt(parts[1]);
            totalSecondes += (minutes * 60) + secondes;
        }
    });

    const moyenneSecondes = totalSecondes / data.length;
    const minFinal = Math.floor(moyenneSecondes / 60);
    const secFinal = Math.round(moyenneSecondes % 60);
    
    const tempsFormate = `${minFinal}:${secFinal.toString().padStart(2, '0')}`;
    document.getElementById('avg-duration').innerText = tempsFormate;
}
// --- PARTIE GRAPHIQUE (Années 2000-2023) ---
function afficherGraphique(data) {
   
    let listeAnnees = [];
    let listeMoyennes = [];    // ÉTAPE 2 : On fait une boucle de 2000 jusqu'à 2023
    for (let annee = 2000; annee <= 2023; annee++) {
        
        let chansonsDeLAnnee = data.filter(item => parseInt(item.year) === annee); 

        if (chansonsDeLAnnee.length === 0) {
       
            listeMoyennes.push(0);
        } else {
           
            let total = 0;
            for (let i = 0; i < chansonsDeLAnnee.length; i++) {
                total += chansonsDeLAnnee[i].popularity;
            }
            
            let moyenne = total / chansonsDeLAnnee.length;
            
            // On ajoute le résultat dans notre liste 
            listeMoyennes.push(moyenne.toFixed(2));
        }

        // On ajoute l'année dans la liste des années
        listeAnnees.push(annee);
    }

   
    var options = {
        series: [{
            name: 'Popularité Moyenne',
            data: listeMoyennes // liste des moyennes calculées
        }],
        chart: {
            type: 'area',      
            height: 350,
            background: 'transparent', 
            toolbar: { show: false }   // Cache le menu de zoom
        },
        colors: ['#1db954'],   // 
        stroke: { curve: 'smooth' }, // Ligne arrondie 
        xaxis: {
            categories: listeAnnees, // Liste des années
            labels: { style: { colors: '#888' } } 
        },
        yaxis: {
            labels: { style: { colors: '#888' } } 
        },
        grid: {
            borderColor: '#333' 
        },
        theme: { mode: 'dark' } 
    };


    document.querySelector("#main-chart").innerHTML = "";
    
    var chart = new ApexCharts(document.querySelector("#main-chart"), options);
    chart.render();
}

// Fonction utilitaire
function trouverPlusFrequent(liste) {
    
    // Si la liste est vide, on renvoie un tiret
    if (liste.length === 0) return "-";

    // 1. On prépare nos outils
    let compteur = {};      
    let final = liste[0]; 
    let record = 1;         


    for (const element of liste) {
        
        if (compteur[element]) {
            compteur[element]++; // On ajoute +1 s'il existe déjà
        } else {
            compteur[element] = 1; // On l'initialise à 1 si c'est la première fois
        }

        if (compteur[element] > record) {
            final = element;          
            record = compteur[element]; 
        }
    }

    return final;
}