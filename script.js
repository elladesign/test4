class RecipeManager {
    constructor() {
        this.recipes = [];
        this.favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        this.setupEventListeners();
        this.fetchRecipes();
        this.allRecipes = [];
        this.setupFilters();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });

        // Custom recipe form
        document.getElementById('customRecipeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCustomRecipe();
        });

        // Cancel button for custom recipe form
        document.getElementById('cancelCustomRecipe').addEventListener('click', () => {
            document.getElementById('customRecipeForm').reset();
            this.switchTab('all');
        });
    }

    async fetchRecipes() {
        const spinner = document.getElementById('loadingSpinner');
        const illustration = document.getElementById('initialIllustration');
        try {
            illustration.style.display = 'flex'; // Show illustration initially
            spinner.classList.remove('show'); // Ensure spinner is hidden initially

            const cuisines = ['American', 'Indian', 'Chinese', 'Italian', 'Mexican', 'Thai', 'Japanese', 'French'];
            this.allRecipes = [];
            
            for (const cuisine of cuisines) {
                const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${cuisine}`);
                const data = await response.json();
                
                if (data.meals) {
                    const shuffledMeals = data.meals.sort(() => Math.random() - 0.5);
                    for (const meal of shuffledMeals.slice(0, 10)) {
                        const detailResponse = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`);
                        const detailData = await detailResponse.json();
                        if (detailData.meals && detailData.meals[0]) {
                            const fullMeal = detailData.meals[0];
                            if (!this.allRecipes.some(r => r.id === fullMeal.idMeal)) {
                                this.allRecipes.push({
                                    id: fullMeal.idMeal,
                                    name: fullMeal.strMeal,
                                    ingredients: this.getIngredients(fullMeal),
                                    instructions: fullMeal.strInstructions,
                                    image: fullMeal.strMealThumb,
                                    category: fullMeal.strCategory,
                                    cuisine: fullMeal.strArea,
                                    tags: fullMeal.strTags
                                });
                            }
                        }
                    }
                }
            }

            this.recipes = this.shuffleArray(this.allRecipes).slice(0, 30);
            this.populateTagFilter(this.allRecipes); // Populate tag filter dynamically
            this.showAllRecipes();

        } catch (error) {
            console.error('Error fetching recipes:', error);
            const recipeList = document.getElementById('recipeList');
            recipeList.innerHTML = '<p>Error loading recipes. Please try again later.</p>';
        } finally {
            illustration.style.display = 'none'; // Hide illustration once loaded
        }
    }

    getIngredients(meal) {
        const ingredients = [];
        for (let i = 1; i <= 20; i++) {
            const ingredient = meal[`strIngredient${i}`];
            const measure = meal[`strMeasure${i}`];
            if (ingredient && ingredient.trim()) {
                ingredients.push(`${measure} ${ingredient}`.trim());
            }
        }
        return ingredients;
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
        document.getElementById(tabName === 'all' ? 'allRecipes' : 
                              tabName === 'favorites' ? 'favorites' : 'custom')
                .classList.remove('hidden');
        
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        if (tabName === 'all') this.showAllRecipes();
        if (tabName === 'favorites') this.showFavorites();
    }

    createRecipeCard(recipe, isFavorite = false) {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.innerHTML = `
            <img src="${recipe.image}" alt="${recipe.name}" class="recipe-image">
            <h3>${recipe.name}</h3>
            <p><strong>Category:</strong> ${recipe.category}</p>
            <p><strong>Cuisine:</strong> ${recipe.cuisine}</p>
            <p><strong>Tags:</strong> ${recipe.tags ? recipe.tags.split(',').join(', ') : 'None'}</p>
            <p><strong>Ingredients:</strong></p>
            <ul>${recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}</ul>
            <p><strong>Instructions:</strong></p>
            <p>${recipe.instructions}</p>
            <button class="favorite-btn" data-id="${recipe.id}">
                ${isFavorite ? '❤️ Remove from Favorites' : '🤍 Add to Favorites'}
            </button>
        `;

        card.querySelector('.favorite-btn').addEventListener('click', () => {
            this.toggleFavorite(recipe.id);
        });

        return card;
    }

    showAllRecipes() {
        const recipeList = document.getElementById('recipeList');
        const resultsCount = document.getElementById('resultsCount');
        
        // Update results count
        resultsCount.textContent = `Showing ${this.recipes.length} recipes`;
        
        // Clear and populate recipe list
        recipeList.innerHTML = '';
        this.recipes.forEach(recipe => {
            recipeList.appendChild(
                this.createRecipeCard(recipe, this.favorites.includes(recipe.id))
            );
        });
    }

    showFavorites() {
        const favoritesList = document.getElementById('favoritesList');
        favoritesList.innerHTML = '';
        this.favorites.forEach(id => {
            const recipe = this.recipes.find(r => r.id === id);
            if (recipe) {
                favoritesList.appendChild(this.createRecipeCard(recipe, true));
            }
        });
    }

    toggleFavorite(id) {
        const index = this.favorites.indexOf(id);
        if (index === -1) {
            this.favorites.push(id);
        } else {
            this.favorites.splice(index, 1);
        }
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        this.showAllRecipes();
        this.showFavorites();
    }

    addCustomRecipe() {
        const newRecipe = {
            id: Date.now(),
            cuisine: document.getElementById('customCuisine').value,
            name: document.getElementById('recipeName').value,
            ingredients: document.getElementById('ingredients').value.split('\n').filter(i => i.trim()),
            instructions: document.getElementById('instructions').value,
            cookTime: document.getElementById('cookTime').value
        };

        // Add the new recipe to the favorites array
        this.favorites.push(newRecipe.id);
        this.recipes.push(newRecipe);
        localStorage.setItem('recipes', JSON.stringify(this.recipes));
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        document.getElementById('customRecipeForm').reset();
        this.showAllRecipes();
        this.switchTab('favorites'); // Switch to "My Recipes" tab
    }

    // Helper method to shuffle array
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    setupFilters() {
        // Apply filters button
        document.getElementById('applyFilters').addEventListener('click', () => {
            this.applyFilters();
        });

        // Update available options when filters change
        ['cuisineFilter', 'proteinFilter'].forEach(filterId => {
            document.getElementById(filterId).addEventListener('change', () => {
                this.updateAvailableOptions(filterId);
            });
        });

        // Setup time slider
        const timeSlider = document.getElementById('timeSlider');
        const timeValue = document.getElementById('timeValue');
        
        timeSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (value === 0) {
                timeValue.textContent = 'Any Time';
            } else {
                timeValue.textContent = `${value} mins`;
            }
        });
    }

    updateAvailableOptions(changedFilterId) {
        const cuisineFilter = document.getElementById('cuisineFilter').value;
        const proteinFilter = document.getElementById('proteinFilter').value;

        // If cuisine filter changed, reset other filters
        if (changedFilterId === 'cuisineFilter') {
            document.getElementById('proteinFilter').value = '';
        }

        // Get filtered recipes based on current selections
        const filteredRecipes = this.allRecipes.filter(recipe => {
            let matchesCuisine = !cuisineFilter || recipe.cuisine === cuisineFilter;
            
            // Only apply other filters if cuisine filter hasn't changed
            let matchesProtein = true;
            
            if (changedFilterId !== 'cuisineFilter') {
                matchesProtein = !proteinFilter || this.matchesProteinFilter(recipe, proteinFilter);
            }

            return matchesCuisine && matchesProtein;
        });

        // Update available options based on filtered recipes
        if (changedFilterId === 'cuisineFilter') {
            // When cuisine changes, update protein options
            const availableProteins = this.getAvailableProteins(filteredRecipes);
            this.updateSelectOptions('proteinFilter', availableProteins);
        } else {
            // For other changes, update everything except the changed filter
            if (changedFilterId !== 'proteinFilter') {
                const availableProteins = this.getAvailableProteins(filteredRecipes);
                this.updateSelectOptions('proteinFilter', availableProteins);
            }
        }
    }

    updateSelectOptions(selectId, availableValues) {
        const select = document.getElementById(selectId);
        const currentValue = select.value;

        Array.from(select.options).forEach(option => {
            if (option.value === '') return; // Skip the "All" option
            const isAvailable = availableValues.includes(option.value);
            option.disabled = !isAvailable;
            option.classList.toggle('disabled-option', !isAvailable);
        });

        // If current value is no longer available, reset to "All"
        if (currentValue && !availableValues.includes(currentValue)) {
            select.value = '';
        }
    }

    getAvailableProteins(recipes) {
        const proteins = new Set();
        recipes.forEach(recipe => {
            if (this.matchesProteinFilter(recipe, 'Beef')) proteins.add('Beef');
            if (this.matchesProteinFilter(recipe, 'Chicken')) proteins.add('Chicken');
            if (this.matchesProteinFilter(recipe, 'Pork')) proteins.add('Pork');
            if (this.matchesProteinFilter(recipe, 'Seafood')) proteins.add('Seafood');
            if (this.matchesProteinFilter(recipe, 'Vegetarian')) proteins.add('Vegetarian');
        });
        return Array.from(proteins);
    }

    applyFilters() {
        const spinner = document.getElementById('loadingSpinner');
        const illustration = document.getElementById('initialIllustration');
        spinner.classList.add('show');
        illustration.style.display = 'none'; // Hide illustration when filters are applied
        
        setTimeout(() => {
            const cuisineFilter = document.getElementById('cuisineFilter').value;
            const proteinFilter = document.getElementById('proteinFilter').value;
            const tagFilter = document.getElementById('tagFilter').value;
            const timeValue = parseInt(document.getElementById('timeSlider').value);

            const filtered = this.allRecipes.filter(recipe => {
                let matchesCuisine = !cuisineFilter || recipe.cuisine === cuisineFilter;
                let matchesProtein = !proteinFilter || this.matchesProteinFilter(recipe, proteinFilter);
                let matchesTime = this.matchesTimeFilter(recipe, timeValue);
                let matchesTag = !tagFilter || (recipe.tags && recipe.tags.includes(tagFilter));

                return matchesCuisine && matchesProtein && matchesTime && matchesTag;
            });

            this.recipes = this.shuffleArray(filtered).slice(0, 30);
            this.showAllRecipes();
            spinner.classList.remove('show');
        }, 300); // Small delay to ensure spinner shows even for quick filters
    }

    matchesProteinFilter(recipe, protein) {
        if (protein === 'Vegetarian') {
            return !recipe.ingredients.some(ing => 
                ing.toLowerCase().includes('meat') || 
                ing.toLowerCase().includes('chicken') || 
                ing.toLowerCase().includes('beef') || 
                ing.toLowerCase().includes('pork') || 
                ing.toLowerCase().includes('fish')
            );
        }
        return recipe.category === protein || 
               recipe.ingredients.some(ing => ing.toLowerCase().includes(protein.toLowerCase()));
    }

    matchesTimeFilter(recipe, time) {
        if (time === 0) return true; // "Any Time" selected
        
        // Estimate preparation time based on number of ingredients and instructions
        const complexityScore = recipe.ingredients.length + recipe.instructions.split('.').length;
        const estimatedTime = complexityScore * 5; // Rough estimate: 5 mins per complexity point
        
        return estimatedTime <= time;
    }

    populateTagFilter(recipes) {
        const tagSet = new Set();
        recipes.forEach(recipe => {
            if (recipe.tags) {
                recipe.tags.split(',').forEach(tag => tagSet.add(tag.trim()));
            }
        });

        const tagFilter = document.getElementById('tagFilter');
        tagFilter.innerHTML = '<option value="">All Tags</option>'; // Reset options
        tagSet.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            tagFilter.appendChild(option);
        });
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new RecipeManager();
}); 