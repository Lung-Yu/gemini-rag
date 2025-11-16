
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.environ.get('GOOGLE_API_KEY')
genai.configure(api_key=API_KEY)
print(f"✓ API Key 已載入: {API_KEY[:10]}...")


def show_files():
    print("\n已上傳的檔案:")
    for file in genai.list_files():
        print(f"   - {file.display_name} ({file.state.name}) - {file.uri}")

def clear_files():
    for file in genai.list_files():
        genai.delete_file(file)
        print(f"   - 已刪除: {file.display_name}")

    print("\n刪除所有已上傳的檔案...")


def upload_file(file_path):
    try:
        uploaded_file = genai.upload_file(
            path=file_path)
        print(f"✓ 檔案已上傳: {uploaded_file.display_name} ({uploaded_file.name})")
        return uploaded_file
    except Exception as e:
        print(f"\n❌ 上傳檔案錯誤: {e}")
        return None


def summary(files, prompt=""):
    model = genai.GenerativeModel("gemini-2.5-flash")
    try:
        response = model.generate_content([
            prompt,
            *files
        ])
        
        print(f"\n回答:\n{response.text}")
    except Exception as e:
        if "429" in str(e) or "quota" in str(e).lower():
            print("\n⚠ API 配額已達上限")
            print("   請等待約 60 秒後再試，或檢查:")
            print("   - https://ai.dev/usage?tab=rate-limit")
            print("   - https://ai.google.dev/gemini-api/docs/rate-limits")
        else:
            print(f"\n❌ 錯誤: {e}")


if __name__ == "__main__":
    clear_files()

    folder_path = "test-data"
    # upload all files in the folder
    for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)
        upload_file(file_path)

    show_files()

    prompt = "誰有 CISSP 共幾張ISC2證照？"
    summary(genai.list_files(), prompt)