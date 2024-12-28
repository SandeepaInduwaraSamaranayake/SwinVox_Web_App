const form = document.getElementById("upload-form");

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);

    
    const response = await fetch("/upload", { method: "POST", body: formData });

    console.log("--------------finished upload route------------");
    console.log("response is " + JSON.stringify(response));

    const result = await response.json();

    console.log(result)

    const voxelImage = document.getElementById("voxel-image");

    if (result.voxel_plot_base64) 
    {
        voxelImage.src = 'data:image/png;base64,' + result.voxel_plot_base64; // Set the source to the base64 string
        voxelImage.style.display = "block";
    } 
    else 
    {
        alert("Error: " + result.error);
    }
});