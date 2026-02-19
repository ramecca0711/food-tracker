// Function to fetch food macros
async function getFoodMacros(foodItem) {
    try {
        // Attempt to fetch from the local database
        const macros = await fetchFromDatabase(foodItem);
        if (macros) {
            return macros;
        }
        // Fallback to USDA
        const usdaMacros = await fetchFromUSDA(foodItem);
        if (usdaMacros) {
            return usdaMacros;
        }
        // Finally fallback to AI
        const aiMacros = await fetchFromAI(foodItem);
        return aiMacros;
    } catch (error) {
        console.error('Error fetching food macros:', error);
        throw error;
    }
}