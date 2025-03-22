document.addEventListener('DOMContentLoaded', function () {
  const wizardContainer = document.querySelector('.wizard-container');

  if (wizardContainer) {
    const steps = Array.from(wizardContainer.querySelectorAll('.wizard-step'));
    const prevBtn = wizardContainer.querySelector('.prev-btn');
    const nextBtn = wizardContainer.querySelector('.next-btn');
    let currentStep = 0;

    function showStep(stepIndex) {
      steps.forEach((step, index) => {
        step.classList.toggle('active', index === stepIndex);
      });
    }

    function updateButtons() {
      prevBtn.disabled = currentStep === 0;
      nextBtn.disabled = currentStep === steps.length - 1;
    }

    function validateStep(stepIndex) {
      const step = steps[stepIndex];
      const requiredFields = step.querySelectorAll('[required]');
      let isValid = true;

      requiredFields.forEach(field => {
        if (!field.value.trim()) {
          isValid = false;
          field.classList.add('error'); // Add error class for styling
        } else {
          field.classList.remove('error');
        }
      });

      return isValid;
    }

    showStep(currentStep);
    updateButtons();

    prevBtn.addEventListener('click', function () {
      if (currentStep > 0) {
        currentStep--;
        showStep(currentStep);
        updateButtons();
      }
    });

    nextBtn.addEventListener('click', function () {
      if (currentStep < steps.length - 1) {
        if (validateStep(currentStep)) {
          currentStep++;
          showStep(currentStep);
          updateButtons();
        } else {
          alert('Please fill in all required fields.');
        }
      }
    });
  }
});
