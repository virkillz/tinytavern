defmodule ImageGenerator do
  @moduledoc """
  Documentation for `TryOpenai`.
  """

  @url "https://ollama.isengbeli.com/sdapi/v1/txt2img"

  def set_model(model) do
    url = "https://ollama.isengbeli.com/sdapi/v1/options"

    headers = [
      "content-type": "application/json"
    ]

    options = [ssl: [{:versions, [:"tlsv1.2"]}], recv_timeout: 50000, timeout: 20000]
    body = Jason.encode!(%{sd_model_checkpoint: model})

    case HTTPoison.post(url, body, headers, options) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        Jason.decode(body)

      error ->
        IO.inspect(error)
        {:error, "Cannot set model"}
    end
  end

  def get_models() do
    url = "https://ollama.isengbeli.com/sdapi/sdapi/v1/sd-models"

    headers = [
      "content-type": "application/json"
    ]

    options = [ssl: [{:versions, [:"tlsv1.2"]}], recv_timeout: 50000, timeout: 20000]

    case HTTPoison.get(url, headers, options) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        Jason.decode(body)

      error ->
        IO.inspect(error)
        {:error, "Cannot get models"}
    end
  end

  def get_options() do
    url = "https://ollama.isengbeli.com/sdapi/sdapi/v1/options"

    headers = [
      "content-type": "application/json"
    ]

    options = [ssl: [{:versions, [:"tlsv1.2"]}], recv_timeout: 50000, timeout: 20000]

    case HTTPoison.get(url, headers, options) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        Jason.decode(body)

      error ->
        IO.inspect(error)
        {:error, "Cannot get options"}
    end
  end

  def selfie(additional_prompt) do
    additional_prompt = if is_nil(additional_prompt), do: "", else: ", " <> additional_prompt

    draw(
      "Putri Tamara Gotik Beautiful asian with short hair and glasses smiling take a selfie. " <>
        additional_prompt
    )
  end

  def draw_illustration(description) do
    draw(description, "horizontal")
  end

  def draw_only(description, dimention \\ "vertical") do
    url = @url

    headers = [
      "content-type": "application/json"
    ]

    width = if dimention == "vertical", do: 576, else: 768
    height = if dimention == "vertical", do: 768, else: 576

    prompt = %{
      prompt: description <> " <lora:LCM_Lora_SD15:0.97>",
      width: width,
      height: height,
      steps: 8,
      cfg_scale: 1.0,
      sampler_index: "LCM",
      restore_faces: true
    }

    options = [ssl: [{:versions, [:"tlsv1.2"]}], recv_timeout: 50000, timeout: 20000]
    body = Jason.encode!(prompt)

    case HTTPoison.post(url, body, headers, options) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, %{"images" => images}} ->
            {:ok, images |> List.first()}

          _other ->
            {:error, "Cannot create images. Decoding failed"}
        end

      error ->
        IO.inspect(error)
        {:error, "Cannot create images. Invalid response"}
    end
  end

  def draw(prompt, dimention \\ "vertical") do
    case draw_only(prompt, dimention) do
      {:ok, image} ->
        save_image(image)

      {:error, _} ->
        {:error, "Cannot create images. Invalid response"}
    end
  end

  def save_image(image) do
    location = Path.absname("priv/static/images")
    file_name = Nanoid.generate() <> ".png"
    path = "#{location}/#{file_name}"

    case File.write(path, Base.decode64!(image)) do
      :ok ->
        {:ok, file_name}

      _error ->
        {:error, "Cannot save image"}
    end
  end
end
