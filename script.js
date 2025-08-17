document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('#card-container .card');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const progressIndicator = document.getElementById('progress-indicator');

    let currentCardIndex = 0;
    const totalCards = cards.length;

    /**
     * This function finds all the situational question sections and makes them interactive.
     * It runs only once when the page loads.
     */
    function setupRevealAnswerButtons() {
        const questionDetailsBlocks = document.querySelectorAll('details');

        questionDetailsBlocks.forEach(detailsBlock => {
            const summary = detailsBlock.querySelector('summary');
            if (summary && summary.textContent.includes('Two Sample Situational Questions')) {
                
                // Get all paragraphs within the question block
                const allParagraphs = detailsBlock.querySelectorAll('p');

                allParagraphs.forEach(p => {
                    // Check if the paragraph's text content is an answer
                    const text = p.textContent.trim();
                    if (text.startsWith('✅ Correct Answer:') || text.startsWith('Correct Answer:')) {
                        const answerP = p; // This is our answer paragraph

                        // Create a wrapper div for the answer and hide it by default
                        const answerWrapper = document.createElement('div');
                        answerWrapper.className = 'answer-explanation'; // This class is styled to be display: none

                        // Insert the wrapper before the answer paragraph, then move the answer inside it
                        answerP.parentNode.insertBefore(answerWrapper, answerP);
                        answerWrapper.appendChild(answerP);

                        // Create the "Reveal Answer" button
                        const revealBtn = document.createElement('button');
                        revealBtn.textContent = 'Reveal Answer';
                        revealBtn.className = 'reveal-btn';

                        // Insert the button before the answer wrapper
                        answerWrapper.parentNode.insertBefore(revealBtn, answerWrapper);
                        
                        // Add the click event listener to show the answer and hide the button
                        revealBtn.addEventListener('click', () => {
                            answerWrapper.classList.add('visible');
                            revealBtn.style.display = 'none';
                        }, { once: true });
                    }
                });
            }
        });
    }


    /**
     * This function shows a specific card by its index and auto-expands its sections.
     */
    function showCard(index) {
        cards.forEach(card => {
            card.classList.remove('active-card');
        });

        const activeCard = cards[index];
        if (activeCard) {
            activeCard.classList.add('active-card');

            const details = activeCard.querySelectorAll('details');
            details.forEach(detail => {
                detail.open = true;
            });
        }

        progressIndicator.textContent = `Card ${index + 1} of ${totalCards}`;
        prevBtn.disabled = index === 0;
        nextBtn.disabled = index === totalCards - 1;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --- Event Listeners for Navigation ---
    nextBtn.addEventListener('click', () => {
        if (currentCardIndex < totalCards - 1) {
            currentCardIndex++;
            showCard(currentCardIndex);
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentCardIndex > 0) {
            currentCardIndex--;
            showCard(currentCardIndex);
        }
    });

    // --- Initial Setup ---
    setupRevealAnswerButtons();
    
    if (totalCards > 0) {
        showCard(currentCardIndex);
    }
});