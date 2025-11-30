/**
 * ZOHO SALES KNOWLEDGE BASE - Google Apps Script Implementation
 * 
 * This script creates a web interface to search and query the Zoho knowledge base
 * stored in Google Drive as JSON files.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Apps Script project (script.google.com)
 * 2. Upload all JSON files from zoho-knowledge-base folder to your Google Drive
 * 3. Update the FOLDER_ID constant below with your Drive folder ID
 * 4. Copy this code into Code.gs
 * 5. Deploy as Web App (Deploy > New Deployment > Web App)
 * 6. Set access to "Anyone" or your organization
 * 7. Authorize and get your web app URL
 */

// ===== CONFIGURATION =====
const FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE'; // Update this with your folder ID
const KNOWLEDGE_BASE_FILES = {
  'products': '01-zoho-products-complete.json',
  'products_part2': '01-zoho-products-part2.json',
  'products_part3': '01-zoho-products-part3.json',
  'industries': '02-industry-solutions.json',
  'workflows': '03-solution-workflows.json',
  'discovery': '04-discovery-questions.json',
  'scripts': '05-sales-scripts.json',
  'reference': '06-quick-reference.json'
};

// ===== MAIN FUNCTIONS =====

/**
 * Serves the HTML interface
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('Zoho Sales Knowledge Base')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Main search function - searches across all knowledge base files
 * @param {string} query - User's search query
 * @param {string} category - Optional category filter
 * @param {string} industry - Optional industry filter
 * @returns {Object} Search results with matched records
 */
function searchKnowledgeBase(query, category, industry) {
  try {
    const results = [];
    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    // Load all JSON files
    const dataFiles = {
      products: loadJSONFromDrive(folder, 'products/01-zoho-products-complete.json'),
      products2: loadJSONFromDrive(folder, 'products/01-zoho-products-part2.json'),
      products3: loadJSONFromDrive(folder, 'products/01-zoho-products-part3.json'),
      industries: loadJSONFromDrive(folder, 'industries/02-industry-solutions.json'),
      workflows: loadJSONFromDrive(folder, 'workflows/03-solution-workflows.json'),
      discovery: loadJSONFromDrive(folder, 'sales-tools/04-discovery-questions.json'),
      scripts: loadJSONFromDrive(folder, 'sales-tools/05-sales-scripts.json'),
      reference: loadJSONFromDrive(folder, 'sales-tools/06-quick-reference.json')
    };
    
    const searchTerms = query.toLowerCase().split(' ');
    
    // Search products
    if (!category || category === 'Product Knowledge') {
      [dataFiles.products, dataFiles.products2, dataFiles.products3].forEach(data => {
        if (data && data.products) {
          data.products.forEach(product => {
            const score = calculateRelevanceScore(product, searchTerms, industry);
            if (score > 0) {
              results.push({
                type: 'product',
                score: score,
                data: product,
                title: product.app_name,
                summary: product.in_simple_words,
                category: product.category
              });
            }
          });
        }
      });
    }
    
    // Search industries
    if (!category || category === 'Industry Solution') {
      if (dataFiles.industries && dataFiles.industries.industries) {
        dataFiles.industries.industries.forEach(industryData => {
          const score = calculateIndustryScore(industryData, searchTerms, industry);
          if (score > 0) {
            results.push({
              type: 'industry',
              score: score,
              data: industryData,
              title: industryData.industry_name,
              summary: industryData.typical_business_model,
              category: 'Industry Solution'
            });
          }
        });
      }
    }
    
    // Search workflows
    if (!category || category === 'Multi-App Bundle') {
      if (dataFiles.workflows && dataFiles.workflows.workflows) {
        dataFiles.workflows.workflows.forEach(workflow => {
          const score = calculateWorkflowScore(workflow, searchTerms);
          if (score > 0) {
            results.push({
              type: 'workflow',
              score: score,
              data: workflow,
              title: workflow.workflow_name,
              summary: workflow.problem_statement,
              category: 'Workflow Solution'
            });
          }
        });
      }
    }
    
    // Search discovery questions
    if (!category || category === 'Discovery Questions') {
      if (dataFiles.discovery && dataFiles.discovery.question_frameworks) {
        dataFiles.discovery.question_frameworks.forEach(framework => {
          const score = calculateFrameworkScore(framework, searchTerms);
          if (score > 0) {
            results.push({
              type: 'discovery',
              score: score,
              data: framework,
              title: framework.framework_name,
              summary: framework.purpose,
              category: 'Discovery Questions'
            });
          }
        });
      }
    }
    
    // Search sales scripts
    if (!category || category === 'Sales Script') {
      if (dataFiles.scripts) {
        // Search objections
        if (dataFiles.scripts.objection_handling) {
          Object.keys(dataFiles.scripts.objection_handling).forEach(objType => {
            const objections = dataFiles.scripts.objection_handling[objType];
            if (Array.isArray(objections)) {
              objections.forEach(obj => {
                const score = calculateObjectionScore(obj, searchTerms);
                if (score > 0) {
                  results.push({
                    type: 'objection',
                    score: score,
                    data: obj,
                    title: obj.objection,
                    summary: obj.why_they_say_it,
                    category: 'Objection Handling'
                  });
                }
              });
            }
          });
        }
        
        // Search email templates
        if (dataFiles.scripts.email_templates) {
          dataFiles.scripts.email_templates.forEach(template => {
            const score = calculateTemplateScore(template, searchTerms);
            if (score > 0) {
              results.push({
                type: 'email_template',
                score: score,
                data: template,
                title: template.template_name,
                summary: template.use_when,
                category: 'Email Template'
              });
            }
          });
        }
      }
    }
    
    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);
    
    // Return top 20 results
    return {
      success: true,
      query: query,
      total_results: results.length,
      results: results.slice(0, 20)
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get specific product details
 */
function getProductDetails(productId) {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = [
      loadJSONFromDrive(folder, 'products/01-zoho-products-complete.json'),
      loadJSONFromDrive(folder, 'products/01-zoho-products-part2.json'),
      loadJSONFromDrive(folder, 'products/01-zoho-products-part3.json')
    ];
    
    for (const file of files) {
      if (file && file.products) {
        const product = file.products.find(p => p.product_id === productId);
        if (product) {
          return { success: true, data: product };
        }
      }
    }
    
    return { success: false, error: 'Product not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Load JSON file from Google Drive
 */
function loadJSONFromDrive(folder, filePath) {
  try {
    const pathParts = filePath.split('/');
    let currentFolder = folder;
    
    // Navigate to subfolder if needed
    for (let i = 0; i < pathParts.length - 1; i++) {
      const folders = currentFolder.getFoldersByName(pathParts[i]);
      if (folders.hasNext()) {
        currentFolder = folders.next();
      }
    }
    
    // Find the file
    const fileName = pathParts[pathParts.length - 1];
    const files = currentFolder.getFilesByName(fileName);
    
    if (files.hasNext()) {
      const file = files.next();
      const content = file.getBlob().getDataAsString();
      return JSON.parse(content);
    }
    
    return null;
  } catch (error) {
    Logger.log('Error loading file: ' + filePath + ' - ' + error);
    return null;
  }
}

/**
 * Calculate relevance score for products
 */
function calculateRelevanceScore(product, searchTerms, industry) {
  let score = 0;
  const searchableText = [
    product.app_name,
    product.what_it_does,
    product.in_simple_words,
    product.who_needs_it ? product.who_needs_it.join(' ') : '',
    product.pain_points_solved ? product.pain_points_solved.join(' ') : '',
    product.keywords ? product.keywords.join(' ') : '',
    product.tags ? product.tags.join(' ') : ''
  ].join(' ').toLowerCase();
  
  searchTerms.forEach(term => {
    if (searchableText.includes(term)) {
      score += 10;
    }
  });
  
  // Industry filter bonus
  if (industry && product.industries) {
    if (product.industries.some(ind => ind.toLowerCase().includes(industry.toLowerCase()))) {
      score += 50;
    }
  }
  
  return score;
}

/**
 * Calculate relevance score for industries
 */
function calculateIndustryScore(industryData, searchTerms, industry) {
  let score = 0;
  const searchableText = [
    industryData.industry_name,
    industryData.typical_business_model,
    JSON.stringify(industryData.top_pain_points),
    JSON.stringify(industryData.key_workflows)
  ].join(' ').toLowerCase();
  
  searchTerms.forEach(term => {
    if (searchableText.includes(term)) {
      score += 10;
    }
  });
  
  // Exact industry match
  if (industry && industryData.industry_name.toLowerCase().includes(industry.toLowerCase())) {
    score += 100;
  }
  
  return score;
}

/**
 * Calculate relevance score for workflows
 */
function calculateWorkflowScore(workflow, searchTerms) {
  let score = 0;
  const searchableText = [
    workflow.workflow_name,
    workflow.business_scenario,
    workflow.problem_statement,
    workflow.current_pain,
    workflow.apps_required ? workflow.apps_required.join(' ') : '',
    workflow.keywords ? workflow.keywords.join(' ') : ''
  ].join(' ').toLowerCase();
  
  searchTerms.forEach(term => {
    if (searchableText.includes(term)) {
      score += 10;
    }
  });
  
  return score;
}

/**
 * Calculate relevance score for question frameworks
 */
function calculateFrameworkScore(framework, searchTerms) {
  let score = 0;
  const searchableText = [
    framework.framework_name,
    framework.purpose,
    framework.use_when,
    JSON.stringify(framework.questions)
  ].join(' ').toLowerCase();
  
  searchTerms.forEach(term => {
    if (searchableText.includes(term)) {
      score += 10;
    }
  });
  
  return score;
}

/**
 * Calculate relevance score for objections
 */
function calculateObjectionScore(objection, searchTerms) {
  let score = 0;
  const searchableText = [
    objection.objection,
    objection.why_they_say_it,
    JSON.stringify(objection.good_responses || [])
  ].join(' ').toLowerCase();
  
  searchTerms.forEach(term => {
    if (searchableText.includes(term)) {
      score += 10;
    }
  });
  
  return score;
}

/**
 * Calculate relevance score for email templates
 */
function calculateTemplateScore(template, searchTerms) {
  let score = 0;
  const searchableText = [
    template.template_name,
    template.use_when,
    template.email_body
  ].join(' ').toLowerCase();
  
  searchTerms.forEach(term => {
    if (searchableText.includes(term)) {
      score += 10;
    }
  });
  
  return score;
}

/**
 * Get all available industries for filter
 */
function getIndustries() {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const data = loadJSONFromDrive(folder, 'industries/02-industry-solutions.json');
    
    if (data && data.industries) {
      return {
        success: true,
        industries: data.industries.map(ind => ind.industry_name)
      };
    }
    
    return { success: false };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
