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
    successMessage.classList.add('hidden');
    
    // Initialisation du pad de signature
    const signaturePad = new SignaturePad(signaturePadCanvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
        minWidth: 1,
        maxWidth: 2.5
    });
    
    // Réinitialiser le pad de signature
    clearSignatureButton.addEventListener('click', function() {
        signaturePad.clear();
    });
    
    // Changement de langue
    languageSelect.addEventListener('change', function() {
        setLanguage(this.value);
    });
    
    // Initialiser la langue
    setLanguage(languageSelect.value);
    
    // Afficher/masquer la section conducteur additionnel
    hasAdditionalDriverCheckbox.addEventListener('change', function() {
        toggleSection(this.checked, additionalDriverSection);
        toggleRequiredFields(additionalDriverSection, this.checked);
    });
    
    // Afficher/masquer la section carte de crédit supplémentaire
    hasAdditionalCreditCardCheckbox.addEventListener('change', function() {
        toggleSection(this.checked, additionalCreditCardSection);
        toggleRequiredFields(additionalCreditCardSection, this.checked);
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
                key === 'accept_terms' || key === 'accept_data_processing') {
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
        
        // Masquer le message de succès s'il était visible
        successMessage.classList.add('hidden');
        
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
        });
    });
    
    // Fonctions utilitaires
    function setLanguage(lang) {
        document.getElementById('language').value = lang;
        document.querySelectorAll('[class*="lang-"]').forEach(el => {
            el.style.display = 'none';
        });
        document.querySelectorAll('.lang-' + lang).forEach(el => {
            el.style.display = 'block';
        });
    }
    
    function toggleSection(isVisible, section) {
        if (isVisible) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    }
    
    function toggleRequiredFields(section, isRequired) {
        const inputs = section.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (isRequired) {
                input.setAttribute('required', '');
            } else {
                input.removeAttribute('required');
            }
        });
    }
    
    function validateForm() {
        // Validation des champs requis
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value) {
                field.classList.add('error');
                isValid = false;
            } else {
                field.classList.remove('error');
            }
        });
        
        if (!isValid) {
            alert(languageSelect.value === 'fr' ? 
                'Veuillez remplir tous les champs obligatoires.' : 
                'Please fill in all required fields.');
            return false;
        }
        
        // Validation des cases à cocher
        const termsCheckbox = document.getElementById('accept-terms');
        const dataProcessingCheckbox = document.getElementById('accept-data-processing');
        
        if (!termsCheckbox.checked || !dataProcessingCheckbox.checked) {
            alert(languageSelect.value === 'fr' ? 
                'Vous devez accepter les conditions générales et le traitement des données.' : 
                'You must accept the terms and conditions and data processing.');
            return false;
        }
        
        return true;
    }
});
