import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit, Save, X, Eye, Image, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getBlogPosts, saveBlogPosts, BlogPost } from '@/components/landing/LandingBlog';
import LandingNavbar from '@/components/landing/LandingNavbar';
import { Link } from 'react-router-dom';
import RichTextEditor from '@/components/blog/RichTextEditor';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export default function BlogAdmin() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPosts(getBlogPosts());
  }, []);

  const handleSave = () => {
    if (!editingPost) return;

    const updatedPosts = editingPost.id 
      ? posts.map(p => p.id === editingPost.id ? editingPost : p)
      : [...posts, { ...editingPost, id: generateId() }];

    saveBlogPosts(updatedPosts);
    setPosts(updatedPosts);
    setEditingPost(null);
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    const updatedPosts = posts.filter(p => p.id !== id);
    saveBlogPosts(updatedPosts);
    setPosts(updatedPosts);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingPost({
      id: '',
      slug: '',
      title: '',
      excerpt: '',
      content: '',
      author: 'RugBoost Team',
      publishedAt: new Date().toISOString().split('T')[0],
      readTime: 5,
      category: 'Business',
      featured: false,
      metaTitle: '',
      metaDescription: '',
      ogImage: '',
      coverImage: '',
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPost) return;

    // For standalone deployment, convert to data URL
    // In production with storage, you'd upload to a CDN instead
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setEditingPost({ ...editingPost, coverImage: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleCancel = () => {
    setEditingPost(null);
    setIsCreating(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Blog Admin
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your blog posts for SEO and content marketing.
              </p>
            </div>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              New Post
            </Button>
          </div>

          {/* Editor */}
          {editingPost && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{isCreating ? 'Create New Post' : 'Edit Post'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={editingPost.title}
                      onChange={e => setEditingPost({
                        ...editingPost, 
                        title: e.target.value,
                        slug: generateSlug(e.target.value)
                      })}
                      placeholder="Post title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">URL Slug</Label>
                    <Input
                      id="slug"
                      value={editingPost.slug}
                      onChange={e => setEditingPost({...editingPost, slug: e.target.value})}
                      placeholder="url-slug"
                    />
                  </div>
                </div>

                {/* Cover Image Upload */}
                <div className="space-y-2">
                  <Label>Cover Image</Label>
                  <div className="flex gap-4 items-start">
                    {/* Preview */}
                    <div className="w-32 h-20 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                      {editingPost.coverImage ? (
                        <img 
                          src={editingPost.coverImage} 
                          alt="Cover preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image className="h-8 w-8 text-muted-foreground/50" />
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Upload Image
                        </Button>
                        {editingPost.coverImage && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPost({ ...editingPost, coverImage: '' })}
                            className="text-destructive"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <Input
                        placeholder="Or paste image URL..."
                        value={editingPost.coverImage?.startsWith('data:') ? '' : editingPost.coverImage || ''}
                        onChange={e => setEditingPost({ ...editingPost, coverImage: e.target.value })}
                        className="text-sm"
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <p className="text-xs text-muted-foreground">
                        Upload an image or paste a URL. Recommended size: 1200×630px for social sharing.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excerpt">Excerpt (for previews)</Label>
                  <Textarea
                    id="excerpt"
                    value={editingPost.excerpt}
                    onChange={e => setEditingPost({...editingPost, excerpt: e.target.value})}
                    placeholder="Brief summary for search results and social sharing"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Content</Label>
                  <RichTextEditor
                    content={editingPost.content}
                    onChange={(content) => setEditingPost({...editingPost, content})}
                    placeholder="Start writing your article..."
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={editingPost.category}
                      onChange={e => setEditingPost({...editingPost, category: e.target.value})}
                      placeholder="Business"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="author">Author</Label>
                    <Input
                      id="author"
                      value={editingPost.author}
                      onChange={e => setEditingPost({...editingPost, author: e.target.value})}
                      placeholder="Author name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="readTime">Read Time (min)</Label>
                    <Input
                      id="readTime"
                      type="number"
                      value={editingPost.readTime}
                      onChange={e => setEditingPost({...editingPost, readTime: parseInt(e.target.value) || 5})}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="publishedAt">Publish Date</Label>
                    <Input
                      id="publishedAt"
                      type="date"
                      value={editingPost.publishedAt}
                      onChange={e => setEditingPost({...editingPost, publishedAt: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-8">
                    <Switch
                      id="featured"
                      checked={editingPost.featured}
                      onCheckedChange={checked => setEditingPost({...editingPost, featured: checked})}
                    />
                    <Label htmlFor="featured">Featured post</Label>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">SEO Settings</h4>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="metaTitle">Meta Title (optional)</Label>
                      <Input
                        id="metaTitle"
                        value={editingPost.metaTitle || ''}
                        onChange={e => setEditingPost({...editingPost, metaTitle: e.target.value})}
                        placeholder="Custom title for search engines"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="metaDescription">Meta Description (optional)</Label>
                      <Textarea
                        id="metaDescription"
                        value={editingPost.metaDescription || ''}
                        onChange={e => setEditingPost({...editingPost, metaDescription: e.target.value})}
                        placeholder="Custom description for search engines (150-160 chars)"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} className="gap-2">
                    <Save className="h-4 w-4" />
                    Save Post
                  </Button>
                  <Button variant="outline" onClick={handleCancel} className="gap-2">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Posts list */}
          <div className="space-y-4">
            {posts.map(post => (
              <Card key={post.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{post.title}</h3>
                      {post.featured && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {post.category} • {new Date(post.publishedAt).toLocaleDateString()} • {post.readTime} min read
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      asChild
                    >
                      <Link to={`/blog/${post.slug}`} target="_blank">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setEditingPost(post)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(post.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {posts.length === 0 && !isCreating && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No blog posts yet.</p>
                <Button onClick={handleCreate} variant="link" className="mt-2">
                  Create your first post
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
