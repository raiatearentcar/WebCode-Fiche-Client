document.addEventListener('DOMContentLoaded', function() {
    // Éléments du DOM
    const form = document.getElementById('client-form');
    const languageSelect = document.getElementById('language-select');
    const hasAdditionalDriverCheckbox = document.getElementById('has-additional-driver');
    const additionalDriverSection = document.getElementById('additional-driver-section');
    const hasAdditionalCreditCardCheckbox = document.getElementById('has-additional-credit-card');
    const additionalCreditCardSection = document.getElementById('additional-credit-card-section');
    const successMessage = document.getElementById('success-message');
    const signaturePadCanvas = document.getElementById('signature-pad');
    const clearSignatureButton = document.getElementById('clear-signature');
    const signatureDataInput = document.getElementById('signature-data');
    
    // S'assurer que le message de succès est caché au chargement
    successMessage.style.display = 'none';
    
    // Initialisation du pad de signature
    const signaturePad = new SignaturePad(signaturePadCanvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
        minWidth: 1,
        maxWidth: 2.5
    });
    
    // Initialisation de la langue
    setLanguage(languageSelect.value);
    
    // Initialisation de la date du jour pour la signature
    const signatureDateInput = document.getElementById('signature-date');
    const today = new Date().toISOString().split('T')[0];
    signatureDateInput.value = today;
    
    // Récupération de l'ID client depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('id') || generateUniqueId();
    document.getElementById('client-id').value = clientId;
    
    // Changement de langue
    languageSelect.addEventListener('change', function() {
        setLanguage(this.value);
        document.getElementById('language').value = this.value;
    });
    
    // Affichage/masquage des sections conditionnelles
    hasAdditionalDriverCheckbox.addEventListener('change', function() {
        toggleSection(this.checked, additionalDriverSection);
        toggleRequiredFields(additionalDriverSection, this.checked);
    });
    
    hasAdditionalCreditCardCheckbox.addEventListener('change', function() {
        toggleSection(this.checked, additionalCreditCardSection);
        toggleRequiredFields(additionalCreditCardSection, this.checked);
    });
    
    // Effacer la signature
    clearSignatureButton.addEventListener('click', function() {
        signaturePad.clear();
        signatureDataInput.value = '';
    });
    
    // Soumission du formulaire
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        // Vérifier si la signature est vide
        if (signaturePad.isEmpty()) {
            alert(languageSelect.value === 'fr' ? 
                'Veuillez signer le formulaire avant de l\'envoyer.' : 
                'Please sign the form before submitting.');
            return;
        }
        
        // Enregistrer les données de la signature
        signatureDataInput.value = signaturePad.toDataURL();
        
        const formData = new FormData(form);
        const formDataObj = {};
        
        formData.forEach((value, key) => {
            if (key === 'has_additional_driver' || key === 'has_additional_credit_card' || 
                key === 'accept_fines' || key === 'accept_data_processing') {
                formDataObj[key] = true; // Les cases cochées sont toujours true (les non-cochées ne sont pas incluses)
            } else {
                formDataObj[key] = value;
            }
        });
        
        // Ajout des champs manquants pour les cases non cochées
        if (!formData.has('has_additional_driver')) {
            formDataObj.has_additional_driver = false;
        }
        
        if (!formData.has('has_additional_credit_card')) {
            formDataObj.has_additional_credit_card = false;
        }
        
        // Afficher un message de chargement
        const submitButton = this.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = languageSelect.value === 'fr' ? 'Envoi en cours...' : 'Submitting...';
        submitButton.disabled = true;
        
        console.log('Envoi des données au serveur:', formDataObj);
        
        // Envoyer les données au serveur
        fetch('/api/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formDataObj)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Erreur serveur: ' + response.status);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Réponse du serveur:', data);
            if (data.error) {
                throw new Error(data.error);
            }
            // Affichage du message de succès seulement si on a un ID valide
            if (data && data.id) {
                form.style.display = 'none';
                successMessage.classList.remove('hidden');
                alert(languageSelect.value === 'fr' ? 
                    'Formulaire soumis avec succès! ID: ' + data.id : 
                    'Form submitted successfully! ID: ' + data.id);
                signaturePad.clear();
            } else {
                throw new Error(languageSelect.value === 'fr' ? 
                    'Réponse du serveur invalide' : 
                    'Invalid server response');
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            alert(languageSelect.value === 'fr' ? 
                'Une erreur est survenue lors de l\'envoi du formulaire: ' + error.message : 
                'An error occurred while submitting the form: ' + error.message);
        })
        .finally(() => {
            // Rétablir le bouton
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
                'An error occurred while submitting the form. Please try again.');
        });
    });
    
    // Fonctions utilitaires
    function setLanguage(lang) {
        document.body.setAttribute('data-language', lang);
        document.getElementById('language').value = lang;
    }
    
    function toggleSection(isVisible, section) {
        if (isVisible) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    }
    
    function toggleRequiredFields(section, isRequired) {
        const inputs = section.querySelectorAll('input');
        inputs.forEach(input => {
            if (isRequired) {
                input.setAttribute('required', '');
            } else {
                input.removeAttribute('required');
                input.value = ''; // Réinitialisation des valeurs
            }
        });
    }
    
    function validateForm() {
        // Validation de base (HTML5 s'occupe déjà de la plupart)
        
        // Validation du format de la carte de crédit (simplifié)
        const creditCardInput = document.getElementById('main-driver-credit-card');
        const creditCardValue = creditCardInput.value.replace(/\s/g, '');
        
        if (!/^\d{13,19}$/.test(creditCardValue)) {
            alert(languageSelect.value === 'fr' ? 
                'Le numéro de carte de crédit doit contenir entre 13 et 19 chiffres.' : 
                'Credit card number must contain between 13 and 19 digits.');
            creditCardInput.focus();
            return false;
        }
        
        // Validation de la carte additionnelle si cochée
        if (hasAdditionalCreditCardCheckbox.checked) {
            const additionalCreditCardInput = document.getElementById('additional-credit-card');
            const additionalCreditCardValue = additionalCreditCardInput.value.replace(/\s/g, '');
            
            if (!/^\d{13,19}$/.test(additionalCreditCardValue)) {
                alert(languageSelect.value === 'fr' ? 
                    'Le numéro de carte de crédit supplémentaire doit contenir entre 13 et 19 chiffres.' : 
                    'Additional credit card number must contain between 13 and 19 digits.');
                additionalCreditCardInput.focus();
                return false;
            }
        }
        
        return true;
    }
    
    function generateUniqueId() {
        // Génération d'un ID unique côté client (fallback)
        return 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // L'ID client est généré côté serveur lors de la soumission du formulaire
    // Aucune action nécessaire ici
});
