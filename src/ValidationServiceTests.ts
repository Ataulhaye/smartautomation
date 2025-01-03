import { ValidationService } from "./ValidationService";

export class TestValidationService {

    constructor(scriptPath: string) {  
        this.test_validation_service(scriptPath);
    }

    private async test_validation_service(scriptPath: string) {
        
        const validationService = new ValidationService(scriptPath);
        // Python code to validate
        const pythonCode = this.pythonCode_example();
        // Call the checkPythonSyntax method
        await validationService.checkPythonSyntaxAsync(JSON.stringify(pythonCode))
            .then(isValid => {
                if (isValid) {
                    console.log('Syntax is valid.');
                } else {
                    console.log('Syntax is invalid.');
                }
            })
            .catch(error => {
                console.error('Syntax check failed:', error);
            })
            .finally(() => {
                console.log('Syntax check completed.');
            });
    }


    private pythonCode_example(): string {
        return  `
        def bubble_sort(arr):

            # Outer loop to iterate through the list n times
            for n in range(len(arr) - 1, 0, -1):

                # Initialize swapped to track if any swaps occur
                swapped = False

                # Inner loop to compare adjacent elements
                for i in range(n):
                    if arr[i] > arr[i + 1]:

                        # Swap elements if they are in the wrong order
                        arr[i], arr[i + 1] = arr[i + 1], arr[i]

                        # Mark that a swap has occurred
                        swapped = True

                # If no swaps occurred, the list is already sorted
                if not swapped:
                    break


        # Sample list to be sorted
        arr = [39, 12, 18, 85, 72, 10, 2, 18]
        print("Unsorted list is:")
        print(arr)

        bubble_sort(arr)

        print("Sorted list is:")
        print(arr)`;
    }
 
}







