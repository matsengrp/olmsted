// Debug script to examine consolidated JSON structure
// Run this in browser console to check the data

function debugConsolidatedData() {
    // This would be run with real data
    console.log('=== DEBUGGING CONSOLIDATED JSON STRUCTURE ===');
    
    // Example of what to check:
    const data = {}; // Replace with actual uploaded data
    
    if (data.trees) {
        console.log('Trees in data.trees:');
        data.trees.forEach((tree, i) => {
            console.log(`  ${i}: ident=${tree.ident}, tree_id=${tree.tree_id}, clone_id=${tree.clone_id}`);
        });
    }
    
    if (data.clones) {
        Object.entries(data.clones).forEach(([datasetId, clones]) => {
            console.log(`Clones in dataset ${datasetId}:`);
            clones.forEach((clone, i) => {
                console.log(`  Clone ${i}: clone_id=${clone.clone_id}`);
                if (clone.trees) {
                    clone.trees.forEach((treeRef, j) => {
                        console.log(`    Tree ref ${j}: ident=${treeRef.ident}, tree_id=${treeRef.tree_id}`);
                    });
                }
            });
        });
    }
    
    // Check for missing trees
    if (data.trees && data.clones) {
        const treeIdents = new Set(data.trees.map(t => t.ident));
        const referencedIdents = new Set();
        
        Object.values(data.clones).forEach(clones => {
            clones.forEach(clone => {
                if (clone.trees) {
                    clone.trees.forEach(treeRef => {
                        referencedIdents.add(treeRef.ident);
                    });
                }
            });
        });
        
        console.log('Trees available:', Array.from(treeIdents));
        console.log('Trees referenced:', Array.from(referencedIdents));
        console.log('Missing trees:', Array.from(referencedIdents).filter(id => !treeIdents.has(id)));
    }
}

// To use: Call debugConsolidatedData() with your data
console.log('Debug script loaded. Call debugConsolidatedData() with your consolidated JSON data.');