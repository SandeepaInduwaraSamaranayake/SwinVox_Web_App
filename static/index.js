const form = document.getElementById("upload-form");

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);

    
    const response = await fetch("/upload", { method: "POST", body: formData });

    console.log("--------------finished upload route------------");
    console.log("response is " + JSON.stringify(response));

    const result = await response.json();

    const voxelImage = document.getElementById("voxel-image");

    if (result.voxel_plot_path) 
        {
        voxelImage.src = result.voxel_plot_path;
        voxelImage.style.display = "block";
    } else {
        alert("Error: " + result.error);
    }
});