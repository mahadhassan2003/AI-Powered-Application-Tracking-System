"""
Central repository for AI resume parsing knowledge bases and regex arrays.
"""

from typing import Dict, List

# Comprehensive skills database organized by category for Hybrid Resume Parsing
RESUME_SKILLS_DATABASE: Dict[str, Dict[str, List[str]]] = {
    # Programming Languages
    'programming': {
        'python': ['python', 'python3', 'py'],
        'java': ['java', 'java 8', 'java 11', 'java 17'],
        'javascript': ['javascript', 'js', 'ecmascript', 'es6', 'es2020'],
        'typescript': ['typescript', 'ts'],
        'c++': ['c++', 'cpp', 'c plus plus'],
        'c#': ['c#', 'csharp', 'c sharp', '.net'],
        'go': ['golang', 'go lang', ' go '],
        'rust': ['rust'],
        'php': ['php', 'php7', 'php8'],
        'ruby': ['ruby', 'ruby on rails', 'rails'],
        'swift': ['swift', 'ios swift'],
        'kotlin': ['kotlin'],
        'scala': ['scala'],
        'r': [' r ', 'r programming', 'r studio'],
        'matlab': ['matlab'],
        'perl': ['perl'],
        'shell': ['shell', 'bash', 'zsh', 'powershell']
    },
    
    # Web Technologies
    'web': {
        'react': ['react', 'reactjs', 'react.js'],
        'vue': ['vue', 'vuejs', 'vue.js'],
        'angular': ['angular', 'angularjs'],
        'node.js': ['node.js', 'nodejs', 'node js'],
        'express': ['express.js', 'express'],
        'django': ['django'],
        'flask': ['flask'],
        'fastapi': ['fastapi', 'fast api'],
        'html': ['html', 'html5'],
        'css': ['css', 'css3'],
        'sass': ['sass', 'scss'],
        'bootstrap': ['bootstrap'],
        'tailwind': ['tailwind', 'tailwindcss'],
        'webpack': ['webpack'],
        'vite': ['vite'],
        'jquery': ['jquery']
    },
    
    # Databases
    'database': {
        'postgresql': ['postgresql', 'postgres', 'psql'],
        'mysql': ['mysql'],
        'mongodb': ['mongodb', 'mongo'],
        'redis': ['redis'],
        'elasticsearch': ['elasticsearch', 'elastic search'],
        'sqlite': ['sqlite'],
        'oracle': ['oracle db', 'oracle database'],
        'cassandra': ['cassandra'],
        'dynamodb': ['dynamodb', 'dynamo db'],
        'neo4j': ['neo4j'],
        'sql': ['sql', 'structured query language']
    },
    
    # Cloud & DevOps
    'cloud': {
        'aws': ['aws', 'amazon web services', 'ec2', 's3', 'lambda'],
        'azure': ['azure', 'microsoft azure'],
        'gcp': ['gcp', 'google cloud', 'google cloud platform'],
        'docker': ['docker', 'containerization'],
        'kubernetes': ['kubernetes', 'k8s'],
        'jenkins': ['jenkins'],
        'terraform': ['terraform'],
        'ansible': ['ansible'],
        'puppet': ['puppet'],
        'chef': ['chef'],
        'nginx': ['nginx'],
        'apache': ['apache', 'apache httpd']
    },
    
    # AI/ML & Data Science
    'ai_ml': {
        'machine learning': ['machine learning', 'ml', 'artificial intelligence', 'ai'],
        'deep learning': ['deep learning', 'dl', 'neural networks'],
        'tensorflow': ['tensorflow', 'tf'],
        'pytorch': ['pytorch', 'torch'],
        'keras': ['keras'],
        'scikit-learn': ['scikit-learn', 'sklearn', 'sci-kit learn'],
        'pandas': ['pandas'],
        'numpy': ['numpy'],
        'opencv': ['opencv', 'cv2'],
        'nltk': ['nltk', 'natural language toolkit'],
        'spacy': ['spacy'],
        'data science': ['data science', 'data analysis'],
        'computer vision': ['computer vision', 'image processing'],
        'nlp': ['nlp', 'natural language processing'],
        'reinforcement learning': ['reinforcement learning', 'rl']
    },
    
    # Tools & Frameworks
    'tools': {
        'git': ['git', 'version control'],
        'github': ['github'],
        'gitlab': ['gitlab'],
        'jira': ['jira'],
        'confluence': ['confluence'],
        'slack': ['slack'],
        'figma': ['figma'],
        'adobe': ['adobe photoshop', 'photoshop', 'illustrator', 'adobe creative'],
        'tableau': ['tableau'],
        'power bi': ['power bi', 'powerbi'],
        'excel': ['excel', 'microsoft excel', 'spreadsheet']
    },
    
    # Mobile Development
    'mobile': {
        'react native': ['react native', 'react-native'],
        'flutter': ['flutter'],
        'ios': ['ios development', 'objective-c', 'xcode'],
        'android': ['android development', 'android studio'],
        'xamarin': ['xamarin']
    },
    
    # Testing
    'testing': {
        'jest': ['jest'],
        'pytest': ['pytest'],
        'selenium': ['selenium'],
        'cypress': ['cypress'],
        'junit': ['junit'],
        'mocha': ['mocha'],
        'unit testing': ['unit testing', 'tdd', 'test driven development']
    }
}
