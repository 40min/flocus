import openai
import google.generativeai as genai
from app.core.config import settings

class LLMService:
    def __init__(self):
from typing import Optional # Added Optional

class LLMService:
    def __init__(self):
        self.settings = settings

    async def improve_text(self, text_to_process: str, base_prompt_override: Optional[str] = None) -> str:
        if not self.settings.LLM_API_KEY:
            # In a real application, you might want to raise a custom exception
            # or log this error more formally.
            return "Error: LLM_API_KEY is not configured."

        prompt_to_use = base_prompt_override if base_prompt_override is not None else self.settings.LLM_TEXT_IMPROVEMENT_PROMPT
        # Using a separator to clearly distinguish the instruction/prompt from the text to be processed.
        # The specific separator "---" is arbitrary but clear.
        full_prompt_for_llm = f"{prompt_to_use}\n\n---\n\n{text_to_process}"


        try:
            if self.settings.LLM_PROVIDER == "OpenAI":
                openai_model_name = self.settings.LLM_MODEL_NAME if self.settings.LLM_MODEL_NAME else "gpt-3.5-turbo"
                client = openai.AsyncOpenAI(api_key=self.settings.LLM_API_KEY)
                response = await client.chat.completions.create(
                    model=openai_model_name,
                    messages=[
                        {"role": "user", "content": full_prompt_for_llm}
                    ]
                )
                if response.choices and response.choices[0].message and response.choices[0].message.content:
                    return response.choices[0].message.content.strip()
                else:
                    return "Error: OpenAI API call failed to return a valid response."

            elif self.settings.LLM_PROVIDER == "GoogleGemini":
                gemini_model_name = self.settings.LLM_MODEL_NAME if self.settings.LLM_MODEL_NAME else "gemini-pro"
                genai.configure(api_key=self.settings.LLM_API_KEY)
                model = genai.GenerativeModel(gemini_model_name)
                response = await model.generate_content_async(full_prompt_for_llm)
                # Ensure response.text is not None before stripping
                return response.text.strip() if response.text else "Error: GoogleGemini API call failed to return valid text."

            else:
                # This case should ideally be caught by the validator in config.py,
                # but it's good practice to handle it here as well.
                return f"Error: Unknown LLM_PROVIDER: {self.settings.LLM_PROVIDER}"

        except Exception as e:
            # Log the exception e
            # In a real application, you would have more sophisticated error handling.
            return f"Error: An exception occurred while contacting the LLM provider: {str(e)}"

# Example usage (optional, for testing purposes):
# if __name__ == "__main__":
#     import asyncio
#     # Ensure you have a .env file with your API keys and settings
#     # or that environment variables are set.
#
#     async def main():
#         service = LLMService()
#         # Test OpenAI
#         # Make sure LLM_PROVIDER=OpenAI in your .env or environment
#         # improved_text_openai = await service.improve_text("this is a test text to improve it.")
#         # print(f"OpenAI Improvement: {improved_text_openai}")
#
#         # Test GoogleGemini
#         # Make sure LLM_PROVIDER=GoogleGemini in your .env or environment
#         # And that you have a valid Google AI Studio API Key
#         # improved_text_gemini = await service.improve_text("this is another test, lets see how gemini does.")
#         # print(f"GoogleGemini Improvement: {improved_text_gemini}")
#
#     asyncio.run(main())
