// 图片上传预览处理
function addImageUploadListener(input) {
    input.addEventListener('change', function(e) {
        const container = this.closest('.image-upload-container').querySelector('.image-descriptions');
        container.innerHTML = '';
        
        Array.from(this.files).forEach((file, index) => {
            const reader = new FileReader();
            const div = document.createElement('div');
            div.className = 'image-preview-item';
            
            reader.onload = function(e) {
                div.innerHTML = `
                    <img src="${e.target.result}" alt="预览图片">
                    <input type="text" 
                           name="image-descriptions[]" 
                           placeholder="请输入图片描述" 
                           class="image-description"
                           required>
                `;
            };
            
            reader.readAsDataURL(file);
            container.appendChild(div);
        });
    });
}

// 删除图片
function deleteImage(button, imagePath) {
    if (confirm('确定要删除这张图片吗？')) {
        button.closest('.image-preview-item').remove();
    }
}

// 编辑新闻
function editNews(id) {
    console.log('编辑按钮被点击，ID:', id);
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('未登录，请先登录');
        }

        fetch(`http://localhost:5000/api/news/${id}`)
            .then(response => response.json())
            .then(news => {
                // 填充表单基本信息
                document.getElementById('news-title').value = news.title;
                document.getElementById('news-date').value = news.date.split('T')[0];
                document.getElementById('news-type').value = news.type;
                
                // 处理外部链接
                const externalUrlGroup = document.querySelector('.external-url-group');
                if (news.type === 'external') {
                    document.getElementById('external-url').value = news.externalUrl || '';
                    externalUrlGroup.style.display = 'block';
                } else {
                    externalUrlGroup.style.display = 'none';
                }
                
                // 清除现有的内容段落
                const contentSections = document.getElementById('content-sections');
                contentSections.innerHTML = '';

                // 添加内容段落和对应的图片
                news.content.forEach((content, index) => {
                    const section = document.createElement('div');
                    section.className = 'content-section';
                    
                    // 创建段落内容
                    section.innerHTML = `
                        <div class="form-group">
                            <label>内容段落</label>
                            <textarea class="news-content-part" name="content[]" rows="5" required>${content}</textarea>
                        </div>
                        <div class="form-group">
                            <label>图片</label>
                            <div class="image-upload-container">
                                <input type="file" class="news-images" name="images[]" multiple accept="image/*">
                                <div class="image-descriptions">
                                    ${news.images
                                        .filter(img => img.sectionIndex === index)
                                        .map(img => `
                                            <div class="image-preview-item">
                                                <img src="/${img.path}" alt="现有图片">
                                                <input type="text" 
                                                       name="existing-image-descriptions[]" 
                                                       value="${img.description || ''}"
                                                       class="image-description"
                                                       required>
                                                <input type="hidden" name="existing-image-paths[]" value="${img.path}">
                                                <button type="button" class="delete-image-btn" onclick="deleteImage(this, '${img.path}')">删除图片</button>
                                            </div>
                                        `).join('')}
                                </div>
                            </div>
                        </div>
                    `;

                    if (index > 0) {
                        section.innerHTML += `
                            <button type="button" class="remove-section-btn">删除此段落</button>
                        `;
                    }
                    
                    contentSections.appendChild(section);
                    addImageUploadListener(section.querySelector('.news-images'));
                });
                
                // 修改表单提交行为
                const form = document.getElementById('news-form');
                form.dataset.editId = id;
                form.querySelector('button[type="submit"]').textContent = '更新新闻';
                
                // 滚动到表单位置
                form.scrollIntoView({ behavior: 'smooth' });
            })
            .catch(error => {
                console.error('编辑错误:', error);
                alert('加载新闻详情失败：' + error.message);
            });
    } catch (error) {
        console.error('编辑错误:', error);
        alert('加载新闻详情失败：' + error.message);
    }
}

// 获取新闻列表
async function loadNewsList() {
    try {
        const response = await fetch('http://localhost:5000/api/news');
        const news = await response.json();
        
        const tbody = document.querySelector('.admin-table tbody');
        tbody.innerHTML = news.map(item => `
            <tr>
                <td>${new Date(item.date).toLocaleDateString()}</td>
                <td>${item.title}</td>
                <td>${item.type === 'local' ? '本地新闻' : '外部链接'}</td>
                <td class="action-buttons">
                    <button class="edit-btn" onclick="editNews('${item._id}')">编辑</button>
                    <button class="delete-btn" onclick="deleteNews('${item._id}')">删除</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加载新闻列表失败：', error);
    }
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 新闻类型切换
    const newsType = document.getElementById('news-type');
    const externalUrlGroup = document.querySelector('.external-url-group');
    
    newsType.addEventListener('change', function() {
        if (this.value === 'external') {
            externalUrlGroup.style.display = 'block';
            document.getElementById('external-url').required = true;
        } else {
            externalUrlGroup.style.display = 'none';
            document.getElementById('external-url').required = false;
        }
    });

    // 添加新段落按钮事件
    document.getElementById('add-section-btn').addEventListener('click', function() {
        const contentSections = document.getElementById('content-sections');
        const newSection = document.createElement('div');
        newSection.className = 'content-section';
        newSection.innerHTML = `
            <div class="form-group">
                <label>内容段落</label>
                <textarea class="news-content-part" name="content[]" rows="5" required></textarea>
            </div>
            <div class="form-group">
                <label>图片</label>
                <div class="image-upload-container">
                    <input type="file" class="news-images" name="images[]" multiple accept="image/*">
                    <div class="image-descriptions">
                    </div>
                </div>
            </div>
            <button type="button" class="remove-section-btn">删除此段落</button>
        `;
        contentSections.appendChild(newSection);
        
        // 为新添加的图片上传添加事件监听
        addImageUploadListener(newSection.querySelector('.news-images'));
    });

    // 删除段落按钮事件委托
    document.getElementById('content-sections').addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-section-btn')) {
            e.target.closest('.content-section').remove();
        }
    });

    // 为初始的图片上传添加事件监听
    const initialImageInput = document.querySelector('.news-images');
    if (initialImageInput) {
        addImageUploadListener(initialImageInput);
    }

    // 新闻表单提交
    const newsForm = document.getElementById('news-form');
    newsForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData();
        
        // 添加基本信息
        formData.append('title', document.getElementById('news-title').value);
        formData.append('date', document.getElementById('news-date').value);
        formData.append('type', document.getElementById('news-type').value);
        
        // 收集所有内容段落和图片
        const sections = document.querySelectorAll('.content-section');
        const contents = [];
        const imageDescriptions = [];
        
        sections.forEach((section, sectionIndex) => {
            const content = section.querySelector('.news-content-part').value;
            contents.push(content);
            
            // 处理现有图片
            const existingDescriptions = Array.from(section.querySelectorAll('input[name="existing-image-descriptions[]"]'))
                .map(input => input.value);
            const existingPaths = Array.from(section.querySelectorAll('input[name="existing-image-paths[]"]'))
                .map(input => input.value);
            
            existingPaths.forEach((path, index) => {
                formData.append('existing-image-paths[]', path);
                formData.append('existing-image-descriptions[]', existingDescriptions[index]);
            });
            
            // 处理新上传的图片
            const imageInput = section.querySelector('.news-images');
            if (imageInput.files.length > 0) {
                const descriptions = Array.from(section.querySelectorAll('.image-description'))
                    .filter(input => !input.name.startsWith('existing-'))
                    .map(input => input.value);
                
                Array.from(imageInput.files).forEach((file, index) => {
                    formData.append('images', file);
                    imageDescriptions.push({
                        sectionIndex,
                        description: descriptions[index] || ''
                    });
                });
            }
        });
        
        formData.append('content', JSON.stringify(contents));
        formData.append('imageDescriptions', JSON.stringify(imageDescriptions));
        
        if (document.getElementById('news-type').value === 'external') {
            formData.append('externalUrl', document.getElementById('external-url').value);
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('未登录，请先登录');
            }

            const editId = this.dataset.editId;
            const url = editId 
                ? `http://localhost:5000/api/news/${editId}`
                : 'http://localhost:5000/api/news';
                
            const method = editId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'x-auth-token': token
                },
                body: formData
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.msg || (editId ? '更新失败' : '发布失败'));
            }

            const result = await response.json();
            console.log('保存成功:', result);
            
            alert(editId ? '更新成功！' : '发布成功！');
            this.reset();
            document.querySelectorAll('.content-section').forEach((section, index) => {
                if (index > 0) section.remove();
            });
            document.querySelector('.image-descriptions').innerHTML = '';
            delete this.dataset.editId;
            this.querySelector('button[type="submit"]').textContent = '发布新闻';
            loadNewsList();
        } catch (error) {
            console.error('保存失败:', error);
            alert(error.message);
        }
    });

    // 加载新闻列表
    loadNewsList();
}); 