document.addEventListener('DOMContentLoaded', () => {
    const articlesContainer = document.getElementById('articles-container');

    /**
     * Carica gli articoli dal file JSON e li renderizza nel DOM.
     */
    const loadArticles = async () => {
        try {
            const response = await fetch('articles.json');
            // Gestisce il caso in cui il file non venga trovato o ci siano altri problemi di rete
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const articles = await response.json();
            renderArticles(articles);
        } catch (error) {
            console.error("Impossibile caricare gli articoli:", error);
            articlesContainer.innerHTML = '<p>Siamo spiacenti, non è stato possibile caricare le notizie. Riprova più tardi.</p>';
        }
    };

    /**
     * Renderizza gli articoli nel container specificato.
     * @param {Array} articles - L'array di oggetti articolo da renderizzare.
     */
    const renderArticles = (articles) => {
        // Svuota il container prima di aggiungere nuovi elementi
        articlesContainer.innerHTML = ''; 

        articles.forEach(articleData => {
            // Crea gli elementi HTML per ogni articolo
            const articleEl = document.createElement('div');
            articleEl.classList.add('article');

            const titleEl = document.createElement('h2');
            titleEl.classList.add('article-title');
            titleEl.textContent = articleData.title;

            const imageEl = document.createElement('img');
            imageEl.classList.add('article-image');
            imageEl.src = articleData.imageUrl;
            imageEl.alt = articleData.title; // Importante per l'accessibilità

            const contentEl = document.createElement('div');
            contentEl.classList.add('article-content');
            contentEl.innerHTML = `<p>${articleData.content}</p>`; // Usiamo innerHTML per renderizzare eventuali tag HTML nel contenuto

            // Aggiunge gli elementi creati all'elemento articolo
            articleEl.appendChild(titleEl);
            articleEl.appendChild(imageEl);
            articleEl.appendChild(contentEl);
            
            // Aggiunge l'event listener per l'effetto di espansione/collasso
            articleEl.addEventListener('click', () => {
                articleEl.classList.toggle('expanded');
            });

            // Aggiunge l'articolo completo al container principale
            articlesContainer.appendChild(articleEl);
        });
    };

    // Avvia il processo di caricamento degli articoli
    loadArticles();
});
