path = "frontend/src/pages/InterviewRoom.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "      const jobId = startRes.data.job_id;\n      await pollForResult(jobId);"

new = ("      if (startRes.data.error) {\n"
       "        console.error(\"Answer submit blocked:\", startRes.data.error);\n"
       "        setScoringError(startRes.data.error);\n"
       "        setLoading(false);\n"
       "        return;\n"
       "      }\n"
       "\n"
       "      const jobId = startRes.data.job_id;\n"
       "      if (!jobId) {\n"
       "        console.error(\"No job_id in response:\", startRes.data);\n"
       "        setScoringError(\"Unexpected response from server. Please try again.\");\n"
       "        setLoading(false);\n"
       "        return;\n"
       "      }\n"
       "\n"
       "      await pollForResult(jobId);")

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("SUCCESS: replacement applied")
else:
    print("FAILED: exact text not found - no changes made")
