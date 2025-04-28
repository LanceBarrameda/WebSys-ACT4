document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const bookTableBody = document.getElementById('bookTableBody');
    let allBooks = []; 
    let pollingIntervalId = null; 
    const POLLING_INTERVAL_MS = 30000; 


    async function fetchBooks(isInitialLoad = true) {
        const dataUrl = 'https://lancebarrameda.github.io/activity-4-28-2025/data.json';

        try {
            if (isInitialLoad) {
                 console.log(`Initial fetch from: ${dataUrl}`);
                 bookTableBody.innerHTML = '<tr><td colspan="4">Loading books...</td></tr>';
            } else {
                 console.log(`Polling fetch from: ${dataUrl}`);
            }

            const response = await fetch(dataUrl, { cache: "no-store" });

            if (!response.ok) {
                 if (isInitialLoad) {
                    let errorMsg = `HTTP error! Status: ${response.status} fetching ${response.url}`;
                     if (response.status === 404) errorMsg = `Error: File not found at ${response.url} (404). Check URL/setup.`;
                     throw new Error(errorMsg);
                 } else {
                     console.warn(`Polling fetch failed: ${response.status} ${response.statusText}`);
                     return; 
                 }
            }

            const newBooksData = await response.json();

            if (!Array.isArray(newBooksData)) {
                throw new Error("Fetched data is not a valid array.");
            }

            console.log("Data fetched successfully.");
            processBookData(newBooksData, isInitialLoad); 

            if (isInitialLoad && !pollingIntervalId) {
                startPolling();
            }

        } catch (error) {
            console.error("Could not fetch or process books:", error);
             if (isInitialLoad) {
                 bookTableBody.innerHTML = `<tr><td colspan="4" style="color: red; font-weight: bold;">Error loading books: ${error.message}</td></tr>`;
                 stopPolling(); 
             } else {
                 console.warn("Error during polling update:", error.message);
             }
        }
    }


    function processBookData(newBooksData, isInitialLoad) {
        if (isInitialLoad) {
            allBooks = newBooksData; 
            displayBooks(allBooks); 
            console.log("Initial display complete.", allBooks.length, "books.");
        } else {
            console.log("Comparing polled data with current data...");
            let updatesMade = false;
            const newBooksMap = new Map(newBooksData.map(book => [book.id, book])); 
            allBooks.forEach(currentBook => {
                const newBook = newBooksMap.get(currentBook.id); 
                if (newBook) {
                    if (currentBook.available !== newBook.available) {
                        console.log(`Status change detected for ID ${currentBook.id} ('${currentBook.title}'): ${currentBook.available} -> ${newBook.available}`);
                        updateBookStatusInTable(currentBook.id, newBook.available);
                        currentBook.available = newBook.available; 
                        updatesMade = true;
                    }
                }
            });


            if (updatesMade) {
                console.log("UI potentially updated based on polled data.");
                 if (searchInput.value.trim() !== '') {
                     performSearch(); 
                 } else {

                 }
            } else {
                console.log("No changes detected in polled data.");
            }
        }
    }


    function displayBooks(booksToDisplay) {
        bookTableBody.innerHTML = ''; 

        if (!Array.isArray(booksToDisplay)) {
             console.error("displayBooks received invalid data:", booksToDisplay);
             bookTableBody.innerHTML = '<tr><td colspan="4">Error displaying books.</td></tr>';
             return;
        }

        if (booksToDisplay.length === 0) {
            if (searchInput.value.trim() !== '') {
                 bookTableBody.innerHTML = '<tr><td colspan="4">No books found matching your search criteria.</td></tr>';
            } else {
                 bookTableBody.innerHTML = '<tr><td colspan="4">No books available.</td></tr>'; 
            }
            return;
        }


        booksToDisplay.forEach(book => {
            if (!book || typeof book.id === 'undefined') {
                console.warn("Skipping book with missing data or ID:", book);
                return; 
            }

            const row = document.createElement('tr');
            row.setAttribute('data-book-id', book.id); 

            const title = book?.title ?? 'N/A';
            const author = book?.author ?? 'N/A';
            const genre = book?.genre ?? 'N/A';

            row.innerHTML = `
                <td>${title}</td>
                <td>${author}</td>
                <td>${genre}</td>
                <td></td> <!-- Placeholder for status -->
            `;

            updateStatusCell(row.cells[3], book?.available); 
            bookTableBody.appendChild(row);
        });
    }

    function updateStatusCell(cell, isAvailable) {
        const statusSpan = document.createElement('span');
        statusSpan.classList.add('status');

        if (typeof isAvailable === 'boolean') {
            if (isAvailable) {
                statusSpan.textContent = 'Available';
                statusSpan.classList.add('status-available');
            } else {
                statusSpan.textContent = 'Checked Out';
                statusSpan.classList.add('status-checked-out');
            }
        } else {
            statusSpan.textContent = 'Unknown';
        }
        cell.innerHTML = ''; 
        cell.appendChild(statusSpan);
    }


    function updateBookStatusInTable(bookId, newAvailability) {
        const rowToUpdate = bookTableBody.querySelector(`tr[data-book-id="${bookId}"]`);

        if (rowToUpdate && rowToUpdate.cells.length > 3) {
            const statusCell = rowToUpdate.cells[3];
            updateStatusCell(statusCell, newAvailability);
        } else {
             if (!rowToUpdate) {
                 console.log(`Row for book ID ${bookId} not found in current display (possibly filtered out). Status updated in memory.`);
             } else {
                 console.warn(`Could not find status cell for book ID ${bookId}`);
             }
        }
    }


    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        console.log(`Performing search for: "${searchTerm}"`);

        if (!Array.isArray(allBooks)) {
            console.warn("Cannot search, 'allBooks' is not available.");
            bookTableBody.innerHTML = '<tr><td colspan="4">Book data not loaded for searching.</td></tr>';
            return;
        }

        const filteredBooks = allBooks.filter(book => {
            const titleMatch = (book?.title ?? '').toLowerCase().includes(searchTerm);
            const authorMatch = (book?.author ?? '').toLowerCase().includes(searchTerm);

            return titleMatch || authorMatch; 
        });

        console.log(`Found ${filteredBooks.length} matching books.`);
        displayBooks(filteredBooks); 
    }

    function startPolling() {
         if (pollingIntervalId) return; 
         console.log(`Starting polling every ${POLLING_INTERVAL_MS / 1000} seconds.`);
         pollingIntervalId = setInterval(() => {
             fetchBooks(false); 
         }, POLLING_INTERVAL_MS);
    }

    function stopPolling() {
         if (pollingIntervalId) {
             console.log("Stopping polling.");
             clearInterval(pollingIntervalId);
             pollingIntervalId = null;
         }
    }

    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            performSearch();
        }
    });

    fetchBooks(true); 

}); 